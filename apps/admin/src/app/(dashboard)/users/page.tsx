'use client';

import { useEffect, useState } from 'react';
import { Badge, Button, Card, CardContent, Skeleton } from '@flowmarket/ui';
import { type AdminUser, getAdminUsers, reactivateUser, suspendUser } from '@/lib/api';

const STATUS_VARIANT: Record<string, 'success' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  SUSPENDED: 'destructive',
  DELETED: 'outline',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function load() {
    const res = await getAdminUsers({ ...(roleFilter ? { role: roleFilter } : {}), page });
    setUsers(res.users);
    setTotalPages(res.totalPages);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, page]);

  async function handleSuspend(id: string) {
    await suspendUser(id);
    await load();
  }

  async function handleReactivate(id: string) {
    await reactivateUser(id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Utilisateurs</h1>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          value={roleFilter}
          onChange={(e) => {
            setPage(1);
            setRoleFilter(e.target.value);
          }}
        >
          <option value="">Tous les rôles</option>
          <option value="CLIENT">Clients</option>
          <option value="PROVIDER">Prestataires</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {!users ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div>
                  <p className="font-medium">
                    {user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.email} · {user.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[user.status] ?? 'outline'}>{user.status}</Badge>
                  {user.role !== 'ADMIN' &&
                    (user.status === 'ACTIVE' ? (
                      <Button variant="outline" size="sm" onClick={() => handleSuspend(user.id)}>
                        Suspendre
                      </Button>
                    ) : user.status === 'SUSPENDED' ? (
                      <Button size="sm" onClick={() => handleReactivate(user.id)}>
                        Réactiver
                      </Button>
                    ) : null)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}
    </div>
  );
}
