'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@flowmarket/ui';
import {
  type AvailabilityRule,
  type ProviderMe,
  createAvailability,
  getMyAvailability,
  getProviderMe,
  removeAvailability,
  updateProviderProfile,
} from '@/lib/api';

const WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function ProviderSettingsPage() {
  const [provider, setProvider] = useState<ProviderMe | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [rules, setRules] = useState<AvailabilityRule[] | null>(null);
  const [weekday, setWeekday] = useState('1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [addingRule, setAddingRule] = useState(false);

  async function loadProfile() {
    const me = await getProviderMe();
    setProvider(me);
    setBusinessName(me.businessName);
    setBio(me.bio ?? '');
  }

  async function loadAvailability() {
    setRules(await getMyAvailability());
  }

  useEffect(() => {
    void loadProfile();
    void loadAvailability();
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await updateProviderProfile({ businessName, bio });
      setProfileSaved(true);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAddRule() {
    setAddingRule(true);
    try {
      await createAvailability({ type: 'RECURRING', weekday: Number(weekday), startTime, endTime });
      await loadAvailability();
    } finally {
      setAddingRule(false);
    }
  }

  async function handleRemoveRule(id: string) {
    await removeAvailability(id);
    await loadAvailability();
  }

  if (!provider || !rules) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Paramètres</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="availability">Disponibilités</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Profil entreprise</CardTitle>
                {provider.verification && (
                  <Badge variant={provider.verification.status === 'APPROVED' ? 'success' : 'outline'}>
                    {provider.verification.status === 'APPROVED' ? 'Vérifié' : 'Vérification en attente'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="business-name">Nom de l'entreprise</Label>
                <Input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Button disabled={savingProfile} onClick={handleSaveProfile}>
                  {savingProfile ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
                {profileSaved && <span className="text-sm text-success">Profil mis à jour.</span>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Créneaux récurrents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {rules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune disponibilité configurée.</p>
              ) : (
                <ul className="space-y-2">
                  {rules.map((rule) => (
                    <li key={rule.id} className="flex items-center justify-between text-sm">
                      <span>
                        {rule.weekday != null ? WEEKDAYS[rule.weekday] : rule.specificDate} — {rule.startTime}–
                        {rule.endTime}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() => handleRemoveRule(rule.id)}
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <Label htmlFor="rule-weekday">Jour</Label>
                  <select
                    id="rule-weekday"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={weekday}
                    onChange={(e) => setWeekday(e.target.value)}
                  >
                    {WEEKDAYS.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="rule-start">Début</Label>
                  <Input id="rule-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="rule-end">Fin</Label>
                  <Input id="rule-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button disabled={addingRule} onClick={handleAddRule} className="w-full">
                    Ajouter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
