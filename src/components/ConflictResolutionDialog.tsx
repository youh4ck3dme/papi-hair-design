import { useEffect, useState } from "react";
import { getDB, getDBOrNull, type QueueItem, type OfflineAppointment } from "@/lib/offline/db";
import { updateAppointmentOffline } from "@/lib/offline/reception";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Clock, X } from "lucide-react";
import { toast } from "sonner";

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolved?: () => void;
}

interface ConflictItem {
  queueItem: QueueItem;
  appointment?: OfflineAppointment;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  onResolved,
}: ConflictResolutionDialogProps) {
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConflicts = async () => {
    const db = await getDBOrNull();
    if (!db) {
      setConflicts([]);
      return;
    }
    const allQueue = await db.getAllFromIndex("queue", "status");
    const items = allQueue.filter((i: any) => i.status === "conflict");
    const result: ConflictItem[] = [];

    for (const item of items) {
      const apptId = item.appointment_id || getPayloadId(item.action);
      let appointment: OfflineAppointment | undefined;
      if (apptId) {
        appointment = await db.get("appointments", apptId);
      }
      result.push({ queueItem: item, appointment });
    }

    setConflicts(result);
  };

  useEffect(() => {
    if (open) loadConflicts();
  }, [open]);

  useEffect(() => {
    if (!open || conflicts.length !== 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => onOpenChange(false), 300);
    return () => window.clearTimeout(timeoutId);
  }, [conflicts.length, onOpenChange, open]);

  const handleAcceptSuggestion = async (conflict: ConflictItem) => {
    setLoading(true);
    try {
      const suggestion = conflict.queueItem.conflict_suggestion;
      const apptId = conflict.queueItem.appointment_id || getPayloadId(conflict.queueItem.action);

      if (!suggestion || !apptId) {
        toast.error("Žiadny návrh k dispozícii");
        return;
      }

      await updateAppointmentOffline({
        id: apptId,
        start_at: suggestion.start_at,
        end_at: suggestion.end_at,
      });

      if (conflict.queueItem.id) {
        const db = await getDB();
        await db.delete("queue", conflict.queueItem.id);
      }

      toast.success("Rezervácia presunutá na navrhovaný čas");
      await loadConflicts();
      onResolved?.();
    } finally {
      setLoading(false);
    }
  };

  const handleDismissConflict = async (conflict: ConflictItem) => {
    if (conflict.queueItem.id) {
      const db = await getDBOrNull();
      if (db) await db.delete("queue", conflict.queueItem.id);
    }
    toast.info("Konflikt ignorovaný");
    await loadConflicts();
    onResolved?.();
  };

  const handleRetry = async (conflict: ConflictItem) => {
    if (conflict.queueItem.id) {
      const db = await getDBOrNull();
      if (db) {
        const item = await db.get("queue", conflict.queueItem.id);
        if (item) {
          await db.put("queue", { ...item, status: "pending", last_error: undefined, conflict_suggestion: undefined });
        }
      }
    }
    toast.info("Zaradené na opätovný sync");
    await loadConflicts();
    onResolved?.();
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("sk", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("sk", { day: "numeric", month: "short" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Konflikty synchronizácie
          </DialogTitle>
          <DialogDescription>
            Niektoré offline zmeny kolidujú so serverom. Vyberte akciu pre
            každý konflikt.
          </DialogDescription>
        </DialogHeader>

        {conflicts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Žiadne konflikty 🎉
          </p>
        ) : (
          <div className="space-y-3">
            {conflicts.map((conflict, idx) => (
              <ConflictCard
                key={conflict.queueItem.id ?? idx}
                conflict={conflict}
                loading={loading}
                onAccept={() => handleAcceptSuggestion(conflict)}
                onDismiss={() => handleDismissConflict(conflict)}
                onRetry={() => handleRetry(conflict)}
                formatTime={formatTime}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConflictCard({
  conflict,
  loading,
  onAccept,
  onDismiss,
  onRetry,
  formatTime,
  formatDate,
}: {
  conflict: ConflictItem;
  loading: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  onRetry: () => void;
  formatTime: (iso: string) => string;
  formatDate: (iso: string) => string;
}) {
  const { queueItem, appointment } = conflict;
  const suggestion = queueItem.conflict_suggestion;

  return (
    <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5 space-y-2">
      <div className="space-y-1">
        {appointment && (
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>
              {formatTime(appointment.start_at)} – {formatTime(appointment.end_at)}
            </span>
            <span className="text-muted-foreground">·</span>
            <span>{appointment.customer_name}</span>
          </div>
        )}
        <p className="text-xs text-destructive font-medium">
          {queueItem.last_error || "Neznámy konflikt"}
        </p>
        <Badge variant="outline" className="text-[10px]">
          {queueItem.action.type.replace("APPOINTMENT_", "")}
        </Badge>
      </div>

      {suggestion && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-2 space-y-1">
          <p className="text-xs font-medium text-primary flex items-center gap-1">
            <ArrowRight className="w-3 h-3" />
            Navrhovaný voľný slot:
          </p>
          <p className="text-sm font-semibold">
            {formatDate(suggestion.start_at)}{" "}
            {formatTime(suggestion.start_at)} – {formatTime(suggestion.end_at)}
          </p>
        </div>
      )}

      <div className="flex gap-1.5 pt-1">
        {suggestion && (
          <Button size="sm" className="h-7 text-xs flex-1" onClick={onAccept} disabled={loading}>
            <ArrowRight className="w-3 h-3 mr-1" />
            Presunúť
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={onRetry} disabled={loading}>
          Skúsiť znova
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onDismiss} disabled={loading}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function getPayloadId(action: QueueItem["action"]): string | undefined {
  if ("payload" in action && action.payload && "id" in action.payload) {
    return (action.payload as any).id;
  }
  return undefined;
}
