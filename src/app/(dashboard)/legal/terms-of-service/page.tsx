import { FileText, AlertTriangle, Shield, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Regulamin Usługi</h1>
        <p className="text-muted-foreground mt-2">
          Ostatnia aktualizacja: 31 grudnia 2025
        </p>
      </div>

      {/* Wprowadzenie */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>1. Postanowienia ogólne</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <p>
            Niniejszy Regulamin określa zasady korzystania z aplikacji Family Planner ("Aplikacja", "Usługa").
            Korzystając z Aplikacji, akceptujesz warunki niniejszego Regulaminu.
          </p>
        </CardContent>
      </Card>

      {/* Definicje */}
      <Card>
        <CardHeader>
          <CardTitle>2. Definicje</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-semibold">Usługodawca</dt>
              <dd className="text-muted-foreground">Family Planner - dostawca Aplikacji</dd>
            </div>
            <div>
              <dt className="font-semibold">Użytkownik</dt>
              <dd className="text-muted-foreground">Osoba korzystająca z Aplikacji po utworzeniu konta</dd>
            </div>
            <div>
              <dt className="font-semibold">Gospodarstwo domowe</dt>
              <dd className="text-muted-foreground">Grupa użytkowników współdzielących dane w Aplikacji</dd>
            </div>
            <div>
              <dt className="font-semibold">Konto</dt>
              <dd className="text-muted-foreground">Indywidualne konto użytkownika chronione hasłem</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Warunki korzystania */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>3. Warunki korzystania z Usługi</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">3.1. Rejestracja konta</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Konto może założyć osoba, która ukończyła 16 lat</li>
              <li>Wymagany jest aktywny adres email</li>
              <li>Hasło musi spełniać wymagania bezpieczeństwa</li>
              <li>Dane rejestracyjne muszą być prawdziwe i aktualne</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3.2. Bezpieczeństwo konta</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Użytkownik jest odpowiedzialny za zachowanie poufności hasła</li>
              <li>Należy natychmiast zgłosić podejrzenie nieuprawnionego dostępu</li>
              <li>Konto jest przypisane do jednej osoby i nie może być udostępniane</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3.3. Dozwolone użycie</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Aplikacja przeznaczona jest do osobistego użytku w celu zarządzania życiem rodzinnym.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Zabronione działania */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">4. Zabronione działania</CardTitle>
          </div>
          <CardDescription>
            Poniższe działania są surowo zabronione i mogą skutkować zawieszeniem konta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">✗</span>
              <span>Wykorzystywanie Aplikacji do działań niezgodnych z prawem</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">✗</span>
              <span>Próby włamania, hakowania lub obejścia zabezpieczeń</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">✗</span>
              <span>Spam, phishing lub inne formy nadużyć</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">✗</span>
              <span>Automatyczne skrypty obciążające serwery (bez zgody)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">✗</span>
              <span>Udostępnianie treści nielegalnych, obraźliwych lub szkodliwych</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-destructive mt-0.5">✗</span>
              <span>Naruszanie praw innych użytkowników</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Odpowiedzialność */}
      <Card>
        <CardHeader>
          <CardTitle>5. Odpowiedzialność</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">5.1. Odpowiedzialność Usługodawcy</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Dokładamy wszelkich starań, aby Usługa działała prawidłowo</li>
              <li>Nie gwarantujemy 100% dostępności (mogą wystąpić przerwy techniczne)</li>
              <li>Nie ponosimy odpowiedzialności za utratę danych spowodowaną przez użytkownika</li>
              <li>Zalecamy regularne wykonywanie backupów (eksport danych)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">5.2. Odpowiedzialność Użytkownika</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Użytkownik odpowiada za treści publikowane w Aplikacji</li>
              <li>Użytkownik odpowiada za zabezpieczenie swojego konta</li>
              <li>Użytkownik ponosi odpowiedzialność za działania wykonane z jego konta</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Własność intelektualna */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>6. Własność intelektualna</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">6.1. Prawa Usługodawcy</h4>
            <p className="text-sm text-muted-foreground">
              Aplikacja, jej kod źródłowy, design i marka są własnością Usługodawcy
              i chronione prawem autorskim.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">6.2. Prawa Użytkownika</h4>
            <p className="text-sm text-muted-foreground">
              Użytkownik zachowuje pełne prawa do treści, które tworzy w Aplikacji
              (zadania, przepisy, notatki, etc.). Udzielasz nam jedynie licencji na przechowywanie
              i wyświetlanie tych treści w ramach świadczenia Usługi.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rozwiązanie umowy */}
      <Card>
        <CardHeader>
          <CardTitle>7. Rozwiązanie umowy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">7.1. Przez Użytkownika</h4>
            <p className="text-sm text-muted-foreground">
              Możesz w dowolnym momencie usunąć swoje konto poprzez Ustawienia → Prywatność → Usuń konto.
              Usunięcie jest nieodwracalne.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">7.2. Przez Usługodawcę</h4>
            <p className="text-sm text-muted-foreground">
              Możemy zawiesić lub usunąć konto w przypadku:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Naruszenia Regulaminu</li>
              <li>Działań nielegalnych lub szkodliwych</li>
              <li>Braku aktywności przez okres dłuższy niż 2 lata</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Zmiany w regulaminie */}
      <Card>
        <CardHeader>
          <CardTitle>8. Zmiany w Regulaminie</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Zastrzegamy sobie prawo do wprowadzania zmian w niniejszym Regulaminie.
            O istotnych zmianach poinformujemy z 30-dniowym wyprzedzeniem poprzez email
            lub powiadomienie w Aplikacji.
          </p>
          <p className="mt-2">
            Kontynuowanie korzystania z Aplikacji po wprowadzeniu zmian oznacza ich akceptację.
          </p>
        </CardContent>
      </Card>

      {/* Prawo właściwe */}
      <Card>
        <CardHeader>
          <CardTitle>9. Prawo właściwe i rozstrzyganie sporów</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Niniejszy Regulamin podlega prawu polskiemu.
          </p>
          <p>
            Wszelkie spory będą rozstrzygane przez właściwy sąd powszechny w Polsce.
          </p>
        </CardContent>
      </Card>

      {/* Kontakt */}
      <Card>
        <CardHeader>
          <CardTitle>10. Kontakt</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="mb-2">
            W sprawach dotyczących Regulaminu lub Usługi:
          </p>
          <div className="space-y-1 text-muted-foreground">
            <p><strong>Email:</strong> support@familyplanner.app</p>
            <p><strong>Usługodawca:</strong> Family Planner</p>
          </div>
        </CardContent>
      </Card>

      {/* Akceptacja */}
      <div className="rounded-lg bg-muted p-4 text-sm">
        <p className="font-semibold mb-2">Akceptacja Regulaminu</p>
        <p className="text-muted-foreground">
          Korzystając z Family Planner, potwierdzasz, że przeczytałeś/aś i akceptujesz
          niniejszy Regulamin oraz Politykę Prywatności.
        </p>
      </div>
    </div>
  );
}

