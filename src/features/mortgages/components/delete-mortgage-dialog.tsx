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

interface DeleteMortgageDialogProps {
    mortgage: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isPending: boolean;
}

export function DeleteMortgageDialog({
    mortgage,
    open,
    onOpenChange,
    onConfirm,
    isPending,
}: DeleteMortgageDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Eliminar hipoteca?</DialogTitle>
                    <DialogDescription>
                        Esta acción no se puede deshacer. La hipoteca será eliminada de forma permanente.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-sm">
                        <strong>Propiedad:</strong> {mortgage.property_address}
                    </p>
                    <p className="text-sm">
                        <strong>Entidad:</strong> {mortgage.lender}
                    </p>
                    <p className="text-sm">
                        <strong>Importe:</strong>{" "}
                        {formatCurrency(Number(mortgage.principal_amount), mortgage.currency)}
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
