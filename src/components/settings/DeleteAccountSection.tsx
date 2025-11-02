import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface DeleteAccountSectionProps {
  onDelete: () => Promise<void>;
}

const CONFIRMATION_TEXT = "USUŃ";

export default function DeleteAccountSection({
  onDelete,
}: DeleteAccountSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmationValid = confirmationInput === CONFIRMATION_TEXT;

  const handleDelete = async () => {
    if (!isConfirmationValid) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete();
      // Nie trzeba zamykać modala ani resetować stanu,
      // bo użytkownik zostanie przekierowany na stronę główną
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Nie udało się usunąć konta"
      );
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Zresetuj input gdy modal jest zamykany
      setConfirmationInput("");
    }
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="text-destructive">Niebezpieczna strefa</CardTitle>
        <CardDescription>
          Akcje w tej sekcji są nieodwracalne
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Usunięcie konta spowoduje trwałe usunięcie wszystkich Twoich danych,
          w tym wszystkich śledzonych ofert i historii cen. Ta akcja jest
          nieodwracalna.
        </p>
      </CardContent>
      <CardFooter>
        <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Usuń konto</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Czy na pewno chcesz usunąć konto?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Ta akcja jest nieodwracalna. Wszystkie Twoje dane, oferty i
                historia cen zostaną trwale usunięte.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4">
              <Label htmlFor="delete-confirmation" className="mb-2 block">
                Wpisz <span className="font-bold">{CONFIRMATION_TEXT}</span>{" "}
                aby potwierdzić:
              </Label>
              <Input
                id="delete-confirmation"
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={CONFIRMATION_TEXT}
                disabled={isDeleting}
                autoComplete="off"
                className="font-mono"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Anuluj
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={!isConfirmationValid || isDeleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting ? "Usuwanie..." : "Usuń konto"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

