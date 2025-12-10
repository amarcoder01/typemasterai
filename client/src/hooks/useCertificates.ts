import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Certificate } from "@shared/schema";

interface CreateCertificateData {
  certificateType: "standard" | "code" | "book" | "race" | "dictation" | "stress";
  testResultId?: number;
  codeTestId?: number;
  bookTestId?: number;
  raceId?: number;
  dictationTestId?: number;
  stressTestId?: number;
  wpm: number;
  accuracy: number;
  consistency: number;
  duration: number;
  metadata?: Record<string, any>;
}

export function useCreateCertificate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCertificateData) => {
      const response = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create certificate");
      }

      return response.json() as Promise<Certificate>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast({
        title: "Certificate Created! 🎉",
        description: "Your achievement certificate has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Certificate Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUserCertificates(userId?: string, certificateType?: string) {
  return useQuery({
    queryKey: ["certificates", userId, certificateType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (certificateType && certificateType !== "all") {
        params.append("type", certificateType);
      }

      const response = await fetch(`/api/certificates/user?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch certificates");
      }

      return response.json() as Promise<Certificate[]>;
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

export function useCertificateById(id: number) {
  return useQuery({
    queryKey: ["certificate", id],
    queryFn: async () => {
      const response = await fetch(`/api/certificates/${id}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch certificate");
      }

      return response.json() as Promise<Certificate>;
    },
    enabled: !!id,
    staleTime: 60000,
  });
}

export function useCertificateByShareId(shareId: string) {
  return useQuery({
    queryKey: ["certificate", "shared", shareId],
    queryFn: async () => {
      const response = await fetch(`/api/certificates/share/${shareId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch shared certificate");
      }

      return response.json() as Promise<Certificate>;
    },
    enabled: !!shareId,
    staleTime: 60000,
  });
}

export function useDeleteCertificate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/certificates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete certificate");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      toast({
        title: "Certificate Deleted",
        description: "Your certificate has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
