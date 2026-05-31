import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Loader2,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { ImportContactsDialog } from "@/components/app/import-contacts-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useContactLists } from "@/hooks/use-contact-lists";
import {
  useContacts,
  useDeleteContact,
  type ContactItem,
} from "@/hooks/use-contacts";

export const Route = createFileRoute("/_authenticated/_shell/contacts")({
  head: () => ({ meta: [{ title: "Contactos · Musicdibs Enterprise" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  const [listId, setListId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const lists = useContactLists(tenantId);
  const contacts = useContacts({ tenantId, listId, search });
  const deleteContact = useDeleteContact(tenantId);

  const totalContacts =
    lists.data?.reduce((acc, l) => acc + l.contact_count, 0) ?? 0;

  async function handleDelete(id: string) {
    try {
      await deleteContact.mutateAsync(id);
      toast.success("Contacto eliminado");
    } catch (e) {
      toast.error("No pudimos eliminar el contacto", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Contactos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalContacts.toLocaleString("es-ES")} contactos en{" "}
            {(lists.data?.length ?? 0).toLocaleString("es-ES")} listas
          </p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="shrink-0">
          <Upload className="mr-1.5 h-4 w-4" />
          Importar CSV
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Listas */}
        <aside className="space-y-1.5">
          <ListButton
            label="Todos los contactos"
            count={totalContacts}
            active={listId === null}
            onClick={() => setListId(null)}
          />
          {lists.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))
            : lists.data?.map((l) => (
                <ListButton
                  key={l.id}
                  label={l.name}
                  count={l.contact_count}
                  active={listId === l.id}
                  onClick={() => setListId(l.id)}
                />
              ))}
        </aside>

        {/* Tabla */}
        <div className="min-w-0 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, nombre o empresa…"
              className="pl-9"
            />
          </div>

          {contacts.isError ? (
            <EmptyState
              icon={Users}
              title="No pudimos cargar los contactos"
              action={
                <Button variant="outline" onClick={() => contacts.refetch()}>
                  Reintentar
                </Button>
              }
            />
          ) : contacts.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (contacts.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "Sin resultados" : "Sin contactos"}
              description={
                search
                  ? "Prueba con otros términos de búsqueda."
                  : "Importa un CSV para empezar a construir tus listas."
              }
              action={
                !search ? (
                  <Button onClick={() => setImportOpen(true)}>
                    <Upload className="mr-1.5 h-4 w-4" />
                    Importar CSV
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Empresa
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      Estado
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.data!.map((c) => (
                    <ContactRow
                      key={c.id}
                      contact={c}
                      onDelete={() => handleDelete(c.id)}
                      deleting={
                        deleteContact.isPending &&
                        deleteContact.variables === c.id
                      }
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <ImportContactsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tenantId={tenantId}
        lists={lists.data ?? []}
        defaultListId={listId}
      />
    </div>
  );
}

function ListButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary/10 font-medium text-primary"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-xs tabular-nums">
        {count.toLocaleString("es-ES")}
      </span>
    </button>
  );
}

function ContactRow({
  contact,
  onDelete,
  deleting,
}: {
  contact: ContactItem;
  onDelete: () => void;
  deleting: boolean;
}) {
  const name = [contact.first_name, contact.last_name]
    .filter(Boolean)
    .join(" ");
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          {name ? <p className="truncate font-medium">{name}</p> : null}
          <p className="truncate text-sm text-muted-foreground">
            {contact.email}
          </p>
        </div>
      </TableCell>
      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
        {contact.company ?? "—"}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant={contact.status === "subscribed" ? "default" : "secondary"}>
          {contact.status === "subscribed"
            ? "Suscrito"
            : contact.status === "unsubscribed"
              ? "Baja"
              : contact.status}
        </Badge>
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
