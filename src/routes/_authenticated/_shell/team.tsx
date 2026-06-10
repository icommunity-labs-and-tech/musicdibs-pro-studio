import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Crown,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCancelInvitation,
  useInviteMember,
  useRemoveMember,
  useTeamInvitations,
  useTeamMembers,
  type TeamInvitation,
  type TeamMember,
} from "@/hooks/use-team";

export const Route = createFileRoute("/_authenticated/_shell/team")({
  head: () => ({ meta: [{ title: "Equipo · Musicdibs Enterprise" }] }),
  component: TeamPage,
});

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
  viewer: "Lector",
};

function initialsOf(name?: string | null) {
  const base = name?.trim() || "U";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function TeamPage() {
  const { tenant, profile } = useAuth();
  const tenantId = tenant?.id;
  const isAdmin = profile?.role === "admin" || profile?.role === "owner";

  const members = useTeamMembers(tenantId);
  const invitations = useTeamInvitations(tenantId);
  const [inviteOpen, setInviteOpen] = useState(false);

  const pending =
    invitations.data?.filter((i) => i.status === "pending") ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Equipo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona quién tiene acceso a tu espacio de trabajo.
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setInviteOpen(true)} className="shrink-0">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Invitar miembro
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Miembros</CardTitle>
          <CardDescription>
            {(members.data?.length ?? 0).toLocaleString("es-ES")} personas en{" "}
            {tenant?.name ?? "tu espacio"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))
          ) : (members.data?.length ?? 0) === 0 ? (
            <EmptyState icon={Users2} title="Sin miembros todavía" />
          ) : (
            members.data!.map((m) => <MemberRow key={m.id} member={m} />)
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Invitaciones pendientes
          </CardTitle>
          <CardDescription>
            Invitaciones que aún no se han aceptado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {invitations.isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))
          ) : pending.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Sin invitaciones pendientes"
              description="Invita a tu equipo para colaborar en las campañas."
            />
          ) : (
            pending.map((inv) => (
              <InvitationRow
                key={inv.id}
                invitation={inv}
                tenantId={tenantId}
                canCancel={isAdmin}
              />
            ))
          )}
        </CardContent>
      </Card>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        tenantId={tenantId}
      />
    </div>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/50 px-3 py-2.5">
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-secondary text-xs font-semibold">
          {initialsOf(member.full_name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {member.full_name ?? "Sin nombre"}
        </p>
        <p className="text-xs text-muted-foreground">
          Desde {new Date(member.created_at).toLocaleDateString("es-ES")}
        </p>
      </div>
      {member.is_superadmin ? (
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3 w-3" />
          Superadmin
        </Badge>
      ) : null}
      <Badge variant={member.role === "owner" ? "default" : "secondary"} className="gap-1">
        {member.role === "owner" ? <Crown className="h-3 w-3" /> : null}
        {ROLE_LABELS[member.role] ?? member.role}
      </Badge>
    </div>
  );
}

function InvitationRow({
  invitation,
  tenantId,
  canCancel,
}: {
  invitation: TeamInvitation;
  tenantId: string | undefined;
  canCancel: boolean;
}) {
  const cancel = useCancelInvitation(tenantId);

  async function handleCancel() {
    try {
      await cancel.mutateAsync(invitation.id);
      toast.success("Invitación cancelada");
    } catch (e) {
      toast.error("No pudimos cancelar la invitación", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/50 px-3 py-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Mail className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p className="text-xs text-muted-foreground">
          Expira el{" "}
          {new Date(invitation.expires_at).toLocaleDateString("es-ES")}
        </p>
      </div>
      <Badge variant="secondary">
        {ROLE_LABELS[invitation.role] ?? invitation.role}
      </Badge>
      {canCancel ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={handleCancel}
          disabled={cancel.isPending}
        >
          {cancel.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      ) : null}
    </div>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  tenantId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const invite = useInviteMember(tenantId);

  async function handleInvite() {
    if (!email.includes("@")) {
      toast.error("Introduce un email válido");
      return;
    }
    try {
      const res = await invite.mutateAsync({ email, role });
      toast.success(
        res.email_sent
          ? "Invitación enviada por email"
          : "Invitación creada",
      );
      setEmail("");
      setRole("member");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : undefined;
      if (msg && /ya es miembro/i.test(msg)) {
        toast.error("Este usuario ya es miembro del equipo", {
          description:
            "No es necesario invitarle: ya tiene acceso a este espacio.",
        });
      } else {
        toast.error("No pudimos crear la invitación", {
          description: msg,
        });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Enviaremos una invitación por email para unirse a tu espacio.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@empresa.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="member">Miembro</SelectItem>
                <SelectItem value="viewer">Lector</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={invite.isPending}>
            {invite.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-1.5 h-4 w-4" />
            )}
            Enviar invitación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
