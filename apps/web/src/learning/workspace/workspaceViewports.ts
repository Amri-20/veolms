import { LEARNING_DESKTOP_MINIMIZE_MEDIA_QUERY } from "../player/learningPlayerMotion";
import {
  COURSE_CONTENT_DRAWER_QUERY,
  PHONE_LESSON_DRAWER_QUERY,
} from "./workspaceConstants";

export const subscribeToCourseContentDrawerViewport = (
  onStoreChange: () => void,
) => {
  const media = window.matchMedia(COURSE_CONTENT_DRAWER_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

export const getCourseContentDrawerViewportSnapshot = () =>
  window.matchMedia(COURSE_CONTENT_DRAWER_QUERY).matches;

export const getCourseContentDrawerViewportServerSnapshot = () => false;

export const subscribeToPhoneLessonDrawerViewport = (
  onStoreChange: () => void,
) => {
  const media = window.matchMedia(PHONE_LESSON_DRAWER_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

export const getPhoneLessonDrawerViewportSnapshot = () =>
  window.matchMedia(PHONE_LESSON_DRAWER_QUERY).matches;

export const getPhoneLessonDrawerViewportServerSnapshot = () => false;

export const subscribeToDesktopLearningMinimizeViewport = (
  onStoreChange: () => void,
) => {
  const media = window.matchMedia(LEARNING_DESKTOP_MINIMIZE_MEDIA_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
};

export const getDesktopLearningMinimizeViewportSnapshot = () =>
  window.matchMedia(LEARNING_DESKTOP_MINIMIZE_MEDIA_QUERY).matches;

export const getDesktopLearningMinimizeViewportServerSnapshot = () => false;
