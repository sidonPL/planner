"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Plus,
  Trash2,
  Edit,
  Plane,
  Train,
  Bus,
  Car,
  Building,
  Shield,
  Ticket,
  FileText,
  ExternalLink,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/hooks/useFileUpload";

interface TripDocument {
  id: string;
  name: string;
  type: string;
  url: string | null;
  fileUrl: string | null;
  notes: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  createdAt: Date;
}

interface TripDocumentsProps {
  tripId: string;
  documents: TripDocument[];
  onDocumentsChange: (documents: TripDocument[]) => void;
}

const documentTypes = [
  { value: "FLIGHT", label: "Lot", icon: Plane, color: "text-blue-500" },
  { value: "TRAIN", label: "Pociąg", icon: Train, color: "text-green-600" },
  { value: "BUS", label: "Autobus", icon: Bus, color: "text-orange-500" },
  { value: "CAR_RENTAL", label: "Wynajem samochodu", icon: Car, color: "text-purple-500" },
  { value: "HOTEL", label: "Hotel", icon: Building, color: "text-cyan-600" },
  { value: "INSURANCE", label: "Ubezpieczenie", icon: Shield, color: "text-emerald-600" },
  { value: "TICKET", label: "Bilet", icon: Ticket, color: "text-pink-500" },
  { value: "PASSPORT", label: "Paszport", icon: FileText, color: "text-indigo-600" },
  { value: "VISA", label: "Wiza", icon: FileText, color: "text-red-500" },
  { value: "OTHER", label: "Inne", icon: FileText, color: "text-gray-500" },
];

export function TripDocuments({ tripId, documents, onDocumentsChange }: TripDocumentsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<TripDocument | null>(null);

  const { upload, isUploading } = useFileUpload({
    folder: "trips/documents",
    onSuccess: (result) => {
      if (result.url) {
        setNewDocument({ ...newDocument, fileUrl: result.url });
        toast.success("Plik został przesłany");
      }
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const [newDocument, setNewDocument] = useState({
    name: "",
    type: "FLIGHT",
    url: "",
    fileUrl: "",
    notes: "",
    validFrom: "",
    validUntil: "",
  });

  const resetForm = () => {
    setNewDocument({
      name: "",
      type: "FLIGHT",
      url: "",
      fileUrl: "",
      notes: "",
      validFrom: "",
      validUntil: "",
    });
  };

  const handleAddDocument = async () => {
    if (!newDocument.name.trim()) {
      toast.error("Podaj nazwę dokumentu");
      return;
    }

    try {
      const url = editingDocument
        ? `/api/trips/${tripId}/documents/${editingDocument.id}`
        : `/api/trips/${tripId}/documents`;

      const method = editingDocument ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDocument,
          url: newDocument.url || undefined,
          fileUrl: newDocument.fileUrl || undefined,
          notes: newDocument.notes || undefined,
          validFrom: newDocument.validFrom || undefined,
          validUntil: newDocument.validUntil || undefined,
        }),
      });

      if (response.ok) {
        const document = await response.json();
        if (editingDocument) {
          onDocumentsChange(documents.map(d => d.id === editingDocument.id ? document : d));
          toast.success("Dokument został zaktualizowany");
        } else {
          onDocumentsChange([...documents, document]);
          toast.success("Dokument został dodany");
        }
        setIsAddDialogOpen(false);
        setEditingDocument(null);
        resetForm();
      } else {
        toast.error(editingDocument ? "Nie udało się zaktualizować dokumentu" : "Nie udało się dodać dokumentu");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDocumentsChange(documents.filter((d) => d.id !== documentId));
        toast.success("Dokument został usunięty");
      } else {
        toast.error("Nie udało się usunąć dokumentu");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const getDocumentIcon = (type: string) => {
    const docType = documentTypes.find((t) => t.value === type);
    if (!docType) return FileText;
    return docType.icon;
  };

  const getDocumentColor = (type: string) => {
    const docType = documentTypes.find((t) => t.value === type);
    if (!docType) return "text-gray-500";
    return docType.color;
  };

  const getDocumentLabel = (type: string) => {
    const docType = documentTypes.find((t) => t.value === type);
    if (!docType) return "Inne";
    return docType.label;
  };

  const isDocumentExpiringSoon = (validUntil: Date | null) => {
    if (!validUntil) return false;
    const expiryDate = validUntil instanceof Date ? validUntil : new Date(validUntil);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  };

  const isDocumentExpired = (validUntil: Date | null) => {
    if (!validUntil) return false;
    const expiryDate = validUntil instanceof Date ? validUntil : new Date(validUntil);
    return expiryDate < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dokumenty podróży</h3>
          <p className="text-sm text-muted-foreground">
            Bilety, rezerwacje, ubezpieczenia i inne dokumenty
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj dokument
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Brak dokumentów</p>
            <p className="text-sm text-muted-foreground mb-4">
              Dodaj bilety, rezerwacje i inne ważne dokumenty
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj pierwszy dokument
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((document) => {
            const Icon = getDocumentIcon(document.type);
            const isExpiringSoon = isDocumentExpiringSoon(document.validUntil);
            const isExpired = isDocumentExpired(document.validUntil);

            return (
              <Card key={document.id} className={cn(isExpired && "border-red-500")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg bg-muted", getDocumentColor(document.type))}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{document.name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {getDocumentLabel(document.type)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingDocument(document);
                          setNewDocument({
                            name: document.name,
                            type: document.type,
                            url: document.url || "",
                            fileUrl: document.fileUrl || "",
                            notes: document.notes || "",
                            validFrom: document.validFrom ? new Date(document.validFrom).toISOString().split('T')[0] : "",
                            validUntil: document.validUntil ? new Date(document.validUntil).toISOString().split('T')[0] : "",
                          });
                          setIsAddDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteDocument(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {document.notes && (
                    <p className="text-sm text-muted-foreground">{document.notes}</p>
                  )}

                  {(document.validFrom || document.validUntil) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {document.validFrom && format(new Date(document.validFrom), "d MMM", { locale: pl })}
                        {document.validFrom && document.validUntil && " - "}
                        {document.validUntil && format(new Date(document.validUntil), "d MMM yyyy", { locale: pl })}
                      </span>
                    </div>
                  )}

                  {isExpiringSoon && !isExpired && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Wkrótce wygasa</span>
                    </div>
                  )}

                  {isExpired && (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Dokument wygasł</span>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    {document.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(document.url!, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Otwórz link
                      </Button>
                    )}
                    {document.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(document.fileUrl!, "_blank")}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Pobierz plik
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog dodawania/edycji dokumentu */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          setEditingDocument(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDocument ? "Edytuj dokument" : "Dodaj dokument"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nazwa dokumentu *</Label>
              <Input
                placeholder="np. Bilet lotniczy Warszawa-Paryż"
                value={newDocument.name}
                onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Typ dokumentu</Label>
              <Select
                value={newDocument.type}
                onValueChange={(value) => setNewDocument({ ...newDocument, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", type.color)} />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Link do dokumentu</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={newDocument.url}
                onChange={(e) => setNewDocument({ ...newDocument, url: e.target.value })}
              />
            </div>

            <div>
              <Label>Plik dokumentu</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Lub wklej link do pliku..."
                    value={newDocument.fileUrl}
                    onChange={(e) => setNewDocument({ ...newDocument, fileUrl: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    {isUploading ? "Uploading..." : "Prześlij"}
                  </Button>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await upload(file);
                    }
                  }}
                />
                {newDocument.fileUrl && (
                  <div className="flex items-center gap-2 p-2 rounded bg-muted">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm flex-1 truncate">{newDocument.fileUrl}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewDocument({ ...newDocument, fileUrl: "" })}
                    >
                      Usuń
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Prześlij plik lub wklej link z Google Drive, Dropbox itp.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data ważności od</Label>
                <Input
                  type="date"
                  value={newDocument.validFrom}
                  onChange={(e) => setNewDocument({ ...newDocument, validFrom: e.target.value })}
                />
              </div>
              <div>
                <Label>Data ważności do</Label>
                <Input
                  type="date"
                  value={newDocument.validUntil}
                  onChange={(e) => setNewDocument({ ...newDocument, validUntil: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notatki</Label>
              <Textarea
                placeholder="Dodatkowe informacje..."
                value={newDocument.notes}
                onChange={(e) => setNewDocument({ ...newDocument, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddDocument}>
              {editingDocument ? "Zapisz zmiany" : "Dodaj dokument"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

