import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2,
  Package,
  Link as LinkIcon
} from "lucide-react";
import { Link } from "wouter";

interface MenuItem {
  id: string;
  name: string;
  image?: string;
  category?: string;
  productSegment?: string;
}

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "uploading" | "complete" | "error";
  progress: number;
  objectPath?: string;
  error?: string;
  mappedProductId?: string;
  mappedProductName?: string;
}

export default function BulkImageUploadPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUnionId, setSelectedUnionId] = useState<string>("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: merchants } = useQuery<any[]>({
    queryKey: ["/api/merchants"],
  });

  const { data: menuItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items", selectedUnionId],
    enabled: !!selectedUnionId,
  });

  const updateProductImageMutation = useMutation({
    mutationFn: async ({ productId, imageUrl }: { productId: string; imageUrl: string }) => {
      return await apiRequest("PUT", `/api/menu-items/${productId}`, { image: imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: UploadedImage[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));

    setImages((prev) => [...prev, ...newImages]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (image: UploadedImage): Promise<string | null> => {
    try {
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: "uploading", progress: 20 } : img
        )
      );

      const response = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: image.file.name,
          size: image.file.size,
          contentType: image.file.type || "image/jpeg",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await response.json();

      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, progress: 50 } : img
        )
      );

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: image.file,
        headers: { "Content-Type": image.file.type || "image/jpeg" },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? { ...img, status: "complete", progress: 100, objectPath }
            : img
        )
      );

      return objectPath;
    } catch (error) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id
            ? {
                ...img,
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : img
        )
      );
      return null;
    }
  };

  const handleUploadAll = async () => {
    const pendingImages = images.filter((img) => img.status === "pending");
    if (pendingImages.length === 0) {
      toast({
        title: "No images to upload",
        description: "Please select some images first.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    for (const image of pendingImages) {
      await uploadImage(image);
    }

    setIsUploading(false);

    const successCount = images.filter((img) => img.status === "complete").length;
    toast({
      title: "Upload complete",
      description: `${successCount} images uploaded successfully.`,
    });
  };

  const handleMapToProduct = async (imageId: string, productId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image || !image.objectPath) return;

    const product = menuItems?.find((item) => item.id === productId);
    if (!product) return;

    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId
          ? { ...img, mappedProductId: productId, mappedProductName: product.name }
          : img
      )
    );

    try {
      await updateProductImageMutation.mutateAsync({
        productId,
        imageUrl: image.objectPath,
      });

      toast({
        title: "Image mapped",
        description: `Image linked to "${product.name}"`,
      });
    } catch (error) {
      toast({
        title: "Failed to map image",
        description: "Could not update product image.",
        variant: "destructive",
      });
    }
  };

  const removeImage = (imageId: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  };

  const clearAll = () => {
    images.forEach((img) => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setImages([]);
  };

  const completedCount = images.filter((img) => img.status === "complete").length;
  const mappedCount = images.filter((img) => img.mappedProductId).length;

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Bulk Image Upload</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Upload product images and link them to your menu items
            </p>
          </div>
          <Link href="/union/login">
            <Button variant="outline" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Images
                </CardTitle>
                <CardDescription>
                  Select multiple images to upload. Supports JPG, PNG, and WebP formats.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select District Union (for product mapping)</Label>
                    <Select value={selectedUnionId} onValueChange={setSelectedUnionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a District Union" />
                      </SelectTrigger>
                      <SelectContent>
                        {merchants?.map((merchant) => (
                          <SelectItem key={merchant.id} value={merchant.id}>
                            {merchant.restaurantName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">
                      Click to select images
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or drag and drop your files here
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Max 10MB per file • JPG, PNG, WebP
                    </p>
                  </div>

                  {images.length > 0 && (
                    <div className="flex justify-between items-center pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        {images.length} images • {completedCount} uploaded • {mappedCount} mapped
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearAll}>
                          Clear All
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleUploadAll}
                          disabled={isUploading || images.filter((i) => i.status === "pending").length === 0}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload All
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Uploaded Images ({images.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className="border rounded-lg overflow-hidden bg-white"
                      >
                        <div className="relative aspect-video bg-gray-100">
                          <img
                            src={image.preview}
                            alt={image.file.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeImage(image.id)}
                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-gray-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {image.status === "uploading" && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 className="h-8 w-8 text-white animate-spin" />
                            </div>
                          )}
                          {image.status === "complete" && (
                            <div className="absolute top-2 left-2 p-1 bg-green-500 rounded-full">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            </div>
                          )}
                          {image.status === "error" && (
                            <div className="absolute top-2 left-2 p-1 bg-red-500 rounded-full">
                              <AlertCircle className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="p-3 space-y-2">
                          <p className="text-sm font-medium truncate">{image.file.name}</p>

                          {image.status === "uploading" && (
                            <Progress value={image.progress} className="h-1" />
                          )}

                          {image.status === "error" && (
                            <p className="text-xs text-red-500">{image.error}</p>
                          )}

                          {image.status === "complete" && (
                            <div className="space-y-2">
                              {image.mappedProductId ? (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <LinkIcon className="h-3 w-3" />
                                  <span className="truncate">{image.mappedProductName}</span>
                                </div>
                              ) : (
                                <Select
                                  onValueChange={(productId) =>
                                    handleMapToProduct(image.id, productId)
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Map to product..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {menuItems?.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products
                </CardTitle>
                <CardDescription>
                  {selectedUnionId
                    ? `${menuItems?.length || 0} products available`
                    : "Select a union to see products"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedUnionId ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Select a District Union to view and map products
                  </p>
                ) : menuItems && menuItems.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                      >
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.productSegment}</p>
                        </div>
                        {item.image && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No products found for this union
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>1. Select your District Union first</p>
                <p>2. Upload multiple product images at once</p>
                <p>3. Map each uploaded image to a product</p>
                <p>4. Images are stored permanently in cloud storage</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
