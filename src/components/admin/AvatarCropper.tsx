import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

interface AvatarCropperProps {
    imageSrc: string;
    onConfirm: (croppedImageBlob: Blob) => Promise<void> | void;
    onCancel: () => void;
}

export function AvatarCropper({ imageSrc, onConfirm, onCancel }: AvatarCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCropBlob = async () => {
        if (processing || !croppedAreaPixels) return;
        setProcessing(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (blob) {
                await onConfirm(blob);
            }
        } catch (e) {
            console.error(e);
            toast.error("Nepodarilo sa spracovať obrázok.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent className="sm:max-w-md bg-card border-primary/20 shadow-2xl">
                <DialogHeader>
                    <DialogTitle>Upraviť fotku</DialogTitle>
                    <DialogDescription>
                        Priblížte a posuňte fotku podľa potreby.
                    </DialogDescription>
                </DialogHeader>
                <div className="relative h-64 w-full bg-black/10 rounded-xl overflow-hidden shadow-inner">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                    />
                </div>
                <div className="py-4 space-y-3">
                    <p className="text-sm font-semibold text-muted-foreground">Priblíženie</p>
                    <Slider
                        value={[zoom]}
                        min={1}
                        max={3}
                        step={0.1}
                        onValueChange={(val) => setZoom(val[0])}
                        className="w-full"
                    />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onCancel} className="rounded-xl" disabled={processing}>Zrušiť</Button>
                    <Button onClick={createCropBlob} className="rounded-xl px-8 shadow-lg shadow-primary/20" disabled={processing}>
                        {processing ? "Spracúvam..." : "Použiť"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Utility function to get cropped image as Blob
export const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.src = imageSrc;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg');
    });
};
