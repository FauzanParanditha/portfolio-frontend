import { toast } from "@/hooks/use-toast";

export const handleAxiosError = (error: any) => {
  const res = error?.response;
  const data = res?.data;

  if (res) {
    const titleByStatus: Record<number, string> = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      500: "Internal Server Error",
    };

    const title = titleByStatus[res.status] ?? "Error";

    const message = data?.error?.message || data?.message || "Unknown error";

    const details = data?.error?.details;
    const requestId = data?.requestId;

    const description =
      details && typeof details === "object"
        ? [
            message,
            Object.entries(details)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", "),
            requestId ? `rid: ${requestId}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : requestId
          ? `${message}\n(rid: ${requestId})`
          : message;

    const variant = res.status >= 500 ? "destructive" : "warning";

    toast({
      title,
      description,
      variant,
    });

    return;
  }

  if (error?.request) {
    toast({
      title: "Network Error",
      description: "No response received from the server.",
      variant: "warning",
    });
    return;
  }

  toast({
    title: "Error",
    description: error?.message ?? "Unknown error",
    variant: "destructive",
  });
};
