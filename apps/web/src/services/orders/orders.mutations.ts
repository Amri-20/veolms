import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  OrderDirectRefundRequest,
  RefundRequest,
  RefundResult,
  ReviewRefundRequest,
} from "@veolms/contracts";
import type { ApiError } from "../../lib/api-error";
import { orderKeys } from "./orders.keys";
import { ordersService } from "./orders.service";

export function useRefundOrder() {
  const queryClient = useQueryClient();

  return useMutation<
    RefundResult,
    ApiError,
    { orderId: string; payload: OrderDirectRefundRequest }
  >({
    mutationFn: ({ orderId, payload }) =>
      ordersService.refundOrder(orderId, payload),
    onSuccess: (_data, variables) => {
      // Invalidate order lists, stats, and the specific order detail
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({
        queryKey: orderKeys.detail(variables.orderId),
      });
    },
  });
}

/**
 * Staff answer a learner's refund request. An approval refunds the order,
 * so everything read about orders is read again.
 */
export function useReviewRefundRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    RefundRequest,
    ApiError,
    { requestId: string; payload: ReviewRefundRequest }
  >({
    mutationFn: ({ requestId, payload }) =>
      ordersService.reviewRefundRequest(requestId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
  });
}
