"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Share2,
  Copy,
  Check,
  Facebook,
  Twitter,
  Mail,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";

interface ShareRecipeProps {
  recipeId: string;
  recipeName: string;
  isPublic: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  children?: React.ReactNode;
}

export function ShareRecipe({
  recipeId,
  recipeName,
  isPublic,
  onTogglePublic,
  children,
}: ShareRecipeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/recipes/${recipeId}`
    : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link skopiowany!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying:", error);
      toast.error("Nie udało się skopiować");
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: checked }),
      });

      if (response.ok) {
        onTogglePublic?.(checked);
        toast.success(
          checked
            ? "Przepis jest teraz publiczny"
            : "Przepis jest teraz prywatny"
        );
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("Nie udało się zaktualizować");
    } finally {
      setIsUpdating(false);
    }
  };

  const shareToSocial = (platform: string) => {
    const text = `Sprawdź ten przepis: ${recipeName}`;
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text);

    let url = "";
    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case "email":
        url = `mailto:?subject=${encodedText}&body=${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Udostępnij
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Udostępnij przepis
          </DialogTitle>
          <DialogDescription>
            {recipeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Public/Private Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label htmlFor="public-toggle" className="text-sm font-medium">
                Publiczny przepis
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {isPublic
                  ? "Przepis jest widoczny dla wszystkich użytkowników"
                  : "Przepis jest widoczny tylko dla członków gospodarstwa"}
              </p>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isUpdating}
            />
          </div>

          <Separator />

          {/* Copy Link */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Link do przepisu</Label>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="px-3"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Skopiuj link i wyślij znajomym
            </p>
          </div>

          {/* Social Share */}
          {isPublic && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Udostępnij w social media
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => shareToSocial("facebook")}
                  >
                    <Facebook className="w-4 h-4 mr-2 text-blue-600" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => shareToSocial("twitter")}
                  >
                    <Twitter className="w-4 h-4 mr-2 text-sky-500" />
                    Twitter
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => shareToSocial("whatsapp")}
                  >
                    <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => shareToSocial("email")}
                  >
                    <Mail className="w-4 h-4 mr-2 text-red-600" />
                    Email
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

