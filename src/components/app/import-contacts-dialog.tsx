import { useRef, useState } from "react";
import { FileUp, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  mapCsvToContacts,
  parseCsv,
  type CsvMappingResult,
} from "@/lib/csv";
import { useCreateContacts } from "@/hooks/use-contacts";
import type { ContactListItem } from "@/hooks/use-contact-lists";

export function ImportContactsDialog({
  open,
  onOpenChange,
  tenantId,
  lists,
  defaultListId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
  lists: ContactListItem[];
  defaultListId?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<CsvMappingResult | null>(null);
  const [listId, setListId] = useState<string>(defaultListId ?? "none");

  const createContacts = useCreateContacts(tenantId);

  function reset() {
    setFileName(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        toast.error("El archivo está vacío o no es un CSV válido");
        return;
      }
      setResult(mapCsvToContacts(parsed));
    };
    reader.onerror = () => toast.error("No pudimos leer el archivo");
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!result || result.valid.length === 0) return;
    try {
      const count = await createContacts.mutateAsync({
        contacts: result.valid,
        listId: listId === "none" ? null : listId,
      });
      toast.success(
        `${count.toLocaleString("es-ES")} contactos importados correctamente`,
      );
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("No pudimos importar los contactos", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar contactos</DialogTitle>
          <DialogDescription>
            Sube un CSV con columnas como email, nombre, apellido, empresa y
            teléfono. La primera fila debe ser la cabecera.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {!result ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">
              Haz clic para elegir un archivo CSV
            </span>
            <span className="text-xs text-muted-foreground">
              {fileName ?? "Tamaño máximo recomendado: 500 contactos"}
            </span>
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={reset}
              >
                Cambiar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="font-display text-xl font-bold text-success">
                  {result.valid.length}
                </p>
                <p className="text-xs text-muted-foreground">Válidos</p>
              </div>
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-display text-xl font-bold text-destructive">
                  {result.invalid.length}
                </p>
                <p className="text-xs text-muted-foreground">Con errores</p>
              </div>
            </div>

            {result.invalid.length > 0 ? (
              <ScrollArea className="h-28 rounded-lg border">
                <ul className="divide-y text-xs">
                  {result.invalid.map((e) => (
                    <li
                      key={`${e.row}-${e.reason}`}
                      className="flex justify-between gap-3 px-3 py-1.5"
                    >
                      <span className="text-muted-foreground">
                        Fila {e.row}
                      </span>
                      <span className="text-right text-destructive">
                        {e.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Añadir a la lista</label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin lista</SelectItem>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !result ||
              result.valid.length === 0 ||
              createContacts.isPending
            }
          >
            {createContacts.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            Importar {result ? `${result.valid.length}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
