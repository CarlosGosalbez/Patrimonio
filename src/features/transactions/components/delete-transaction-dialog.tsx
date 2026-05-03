"use client";

import { Button } from "@/shared/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/components/ui/dialog";
import { formatCurrency } from "@/shared/lib/utils";

interface DeleteTransactionDialogProps {
    transaction: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
}

export function DeleteTransactionDialog({
    transaction,
    open,
    onOpenChange,
    onConfirm,
    isPending,
}: DeleteTransactionDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Eliminar transacción?</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. La transacción será eliminada de forma permanente.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm">
                        <strong>Descripción:</strong> {transaction.description}
                    </p>
                    <p className="text-sm">
                        <strong>Cantidad:</strong>{" "}
                        {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                    </p>
                    <p className="text-sm">
                        <strong>Fecha:</strong> {transaction.date}
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={onConfirm}
                        disabled={isPending}
                    >
                        {isPending ? "Eliminando..." : "Eliminar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
