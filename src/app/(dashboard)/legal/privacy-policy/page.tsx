import { Shield, Lock, Eye, FileText, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Polityka Prywatności</h1>
        <p className="text-muted-foreground mt-2">
          Ostatnia aktualizacja: 31 grudnia 2025
        </p>
      </div>

      {/* Wprowadzenie */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Wprowadzenie</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Family Planner ("my", "nas", "nasz") szanuje Twoją prywatność i zobowiązuje się do
            ochrony Twoich danych osobowych. Ta polityka prywatności opisuje, jak zbieramy,
            wykorzystujemy i chronimy Twoje informacje zgodnie z RODO (Rozporządzenie o Ochronie Danych Osobowych).
          </p>
        </CardContent>
      </Card>

      {/* Dane które zbieramy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Jakie dane zbieramy</CardTitle>
          </div>
          <CardDescription>
            Zbieramy tylko dane niezbędne do funkcjonowania aplikacji
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Dane konta</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Email (wymagany do logowania)</li>
              <li>Hasło (zaszyfrowane)</li>
              <li>Imię i nazwisko (opcjonalne)</li>
              <li>Awatar (opcjonalny)</li>
              <li>Data urodzenia (opcjonalna)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Dane użytkowania</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Zadania i projekty</li>
              <li>Przepisy kulinarne</li>
              <li>Lista zakupów i inwentarz</li>
              <li>Harmonogram i wydarzenia</li>
              <li>Budżet i transakcje finansowe</li>
              <li>Plany wycieczek</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Dane techniczne</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Adres IP (do rate limiting i bezpieczeństwa)</li>
              <li>User Agent przeglądarki</li>
              <li>Dane sesji (JWT token)</li>
              <li>Logi aktywności (audit trail)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Dane lokalizacji (opcjonalne)</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Geofencing zones (jeśli włączone)</li>
              <li>Historia obecności (jeśli włączone)</li>
              <li>Udostępnianie lokalizacji rodzinie (jeśli włączone)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Jak wykorzystujemy dane */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>Jak wykorzystujemy Twoje dane</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Świadczenie usług aplikacji (zarządzanie zadaniami, przepisami, budżetem)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Synchronizacja danych między członkami gospodarstwa domowego</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Wysyłanie powiadomień o zadaniach i wydarzeniach</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Ochrona przed nadużyciami i zapewnienie bezpieczeństwa</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span>Poprawa funkcjonalności aplikacji</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Twoje prawa RODO */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            <CardTitle>Twoje prawa zgodnie z RODO</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <h4 className="font-semibold mb-1">✅ Prawo dostępu</h4>
              <p className="text-sm text-muted-foreground">
                Możesz w dowolnym momencie wyeksportować wszystkie swoje dane w formacie JSON
                poprzez Ustawienia → Prywatność → Eksport danych.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">✅ Prawo do sprostowania</h4>
              <p className="text-sm text-muted-foreground">
                Możesz edytować swoje dane w dowolnym momencie w Ustawieniach profilu.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">✅ Prawo do usunięcia ("prawo do bycia zapomnianym")</h4>
              <p className="text-sm text-muted-foreground">
                Możesz trwale usunąć swoje konto poprzez Ustawienia → Prywatność → Usuń konto.
                Wszystkie Twoje dane zostaną nieodwracalnie usunięte.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">✅ Prawo do przenoszenia danych</h4>
              <p className="text-sm text-muted-foreground">
                Export danych w formacie JSON umożliwia przeniesienie ich do innej aplikacji.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">✅ Prawo do ograniczenia przetwarzania</h4>
              <p className="text-sm text-muted-foreground">
                Możesz wyłączyć określone funkcje (np. geofencing, powiadomienia) w Ustawieniach.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bezpieczeństwo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Bezpieczeństwo danych</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Stosujemy następujące środki bezpieczeństwa:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Szyfrowanie haseł (bcrypt)</li>
            <li>HTTPS dla całej komunikacji</li>
            <li>Sesje zabezpieczone JWT tokenami</li>
            <li>Rate limiting (ochrona przed atakami)</li>
            <li>Regularne audyty bezpieczeństwa</li>
            <li>Baza danych z backupami</li>
          </ul>
        </CardContent>
      </Card>

      {/* Pliki cookie */}
      <Card>
        <CardHeader>
          <CardTitle>Pliki cookie</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Używamy następujących cookies:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><strong>Niezbędne:</strong> Sesja użytkownika (JWT token)</li>
            <li><strong>Preferencje:</strong> Dark mode, język interfejsu</li>
            <li><strong>Funkcjonalne:</strong> Zapamiętywanie filtrów i widoków</li>
          </ul>
          <p className="text-muted-foreground">
            Nie używamy cookies reklamowych ani śledzących.
          </p>
        </CardContent>
      </Card>

      {/* Udostępnianie danych */}
      <Card>
        <CardHeader>
          <CardTitle>Udostępnianie danych stronom trzecim</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-2">NIE sprzedajemy Twoich danych.</p>
            <p className="text-sm text-muted-foreground">
              Twoje dane mogą być udostępniane tylko w następujących przypadkach:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Członkom Twojego gospodarstwa domowego (funkcjonalność aplikacji)</li>
              <li>Dostawcom usług cloud (hosting, baza danych) - z zobowiązaniem do ochrony danych</li>
              <li>Na żądanie organów ścigania (jeśli wymagane prawnie)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Zmiany w polityce */}
      <Card>
        <CardHeader>
          <CardTitle>Zmiany w polityce prywatności</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Możemy okresowo aktualizować tę politykę prywatności. O istotnych zmianach
            poinformujemy Cię poprzez email lub powiadomienie w aplikacji.
          </p>
        </CardContent>
      </Card>

      {/* Kontakt */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Kontakt</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="mb-2">
            Jeśli masz pytania dotyczące tej polityki prywatności lub przetwarzania Twoich danych:
          </p>
          <div className="space-y-1 text-muted-foreground">
            <p><strong>Email:</strong> privacy@familyplanner.app</p>
            <p><strong>Administrator danych:</strong> Family Planner</p>
            <p><strong>Organ nadzorczy:</strong> Urząd Ochrony Danych Osobowych (UODO)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

