import { createRouter, createWebHistory } from "vue-router";
import { useTrackerStore } from "../stores/tracker";
import Home from "../views/Home.vue";
import Books from "../views/Books.vue";
import Profile from "../views/Profile.vue";
import Login from "../views/Login.vue";
import Statistics from "../views/Statistics.vue";
import PrivacyPolicy from "../views/PrivacyPolicy.vue";
import TermsOfService from "../views/TermsOfService.vue";
import Landing from "../views/Landing.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "landing", component: Landing },
    { path: "/login", name: "login", component: Login },
    { path: "/privacy", name: "privacy", component: PrivacyPolicy },
    { path: "/terms", name: "terms", component: TermsOfService },
    { path: "/dashboard", name: "home", component: Home },
    { path: "/profile", name: "profile", component: Profile },
    { path: "/books", name: "books", component: Books },
    { path: "/statistics", name: "statistics", component: Statistics },
  ],
});

router.beforeEach(async (to) => {
  const store = useTrackerStore();

  // Ensure store is loaded from IndexedDB before evaluating auth rules
  if (!store.isInitialized) {
    await store.init();
  }
  
  // Public routes that don't require any profile or login
  const publicRoutes = ["landing", "login", "privacy", "terms"];

  // If user has NO name set, they MUST go to login, unless going to a public route
  if (!store.isProfileSet && !publicRoutes.includes(to.name as string)) {
    return { name: "login" };
  }

  // If returning user (profile set) hits landing page, send them to dashboard
  if (store.isProfileSet && to.name === "landing") {
    return { name: "home" };
  }

  // Otherwise proceed
});

export default router;
