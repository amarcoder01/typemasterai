import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Certificate, VerificationResponse } from "@shared/schema";

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

      const response = await fetch(`/api/certificates?${params.toString()}`, {
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

// ============================================================================
// CERTIFICATE VERIFICATION HOOKS
// ============================================================================

/**
 * Hook to verify a certificate by its verification ID
 */
export function useVerifyCertificate(verificationId: string | null) {
  return useQuery<VerificationResponse>({
    queryKey: ["verify", verificationId],
    queryFn: async () => {
      if (!verificationId) {
        throw new Error("Verification ID is required");
      }

      const response = await fetch(`/api/verify/${encodeURIComponent(verificationId)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }

      return response.json();
    },
    enabled: !!verificationId,
    retry: false,
    staleTime: 30000,
  });
}

/**
 * Hook to revoke a certificate
 */
export function useRevokeCertificate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await fetch(`/api/certificates/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to revoke certificate");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["verify"] });
      toast({
        title: "Certificate Revoked",
        description: `Certificate ${data.verificationId} has been revoked.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Revocation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to unrevoke (restore) a certificate
 */
export function useUnrevokeCertificate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/certificates/${id}/unrevoke`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to restore certificate");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
      queryClient.invalidateQueries({ queryKey: ["verify"] });
      toast({
        title: "Certificate Restored",
        description: `Certificate ${data.verificationId} has been restored.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to fetch verification statistics
 */
export function useVerificationStats() {
  return useQuery({
    queryKey: ["verification", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/verification/stats");
      
      if (!response.ok) {
        throw new Error("Failed to fetch verification stats");
      }

      return response.json();
    },
    staleTime: 60000,
  });
}
