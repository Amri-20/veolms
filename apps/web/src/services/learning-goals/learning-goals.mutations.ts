import { useMutation, useQueryClient } from "@tanstack/react-query";

import { learningGoalKeys } from "./learning-goals.keys";
import { learningGoalsService } from "./learning-goals.service";

export function useUpdateLearningGoalSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: learningGoalsService.updateSettings,
    onSuccess: async (settings) => {
      queryClient.setQueryData(learningGoalKeys.settings(), settings);
      // The summary derives today's % and targets from the goal, and today
      // in the history is judged against the goal as it now stands.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: learningGoalKeys.summary(),
        }),
        queryClient.invalidateQueries({
          queryKey: learningGoalKeys.histories(),
        }),
      ]);
    },
  });
}

/** Turns sharing the learner's progress with other members on or off. */
export function useUpdateProgressSharing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: learningGoalsService.updateSharing,
    onSuccess: async () => {
      // Every range of the learner's history says whether it is shared,
      // and the list of members who share has gained or lost them.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: learningGoalKeys.histories(),
        }),
        queryClient.invalidateQueries({
          queryKey: learningGoalKeys.community(),
        }),
      ]);
    },
  });
}
