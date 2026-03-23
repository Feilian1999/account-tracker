import { createRouter, createWebHistory } from "vue-router";
import Home from "../views/Home.vue";
import AddRecord from "../views/AddRecord.vue";
import Books from "../views/Books.vue";
import Setup from "../views/Setup.vue";
import Profile from "../views/Profile.vue";
import Login from "../views/Login.vue";
import Statistics from "../views/Statistics.vue";
import { useTrackerStore } from "../stores/tracker";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/login", name: "login", component: Login },
    { path: "/setup", name: "setup", component: Setup },
    { path: "/", name: "home", component: Home },
    { path: "/profile", name: "profile", component: Profile },
    { path: "/add", name: "add", component: AddRecord },
    { path: "/books", name: "books", component: Books },
    { path: "/statistics", name: "statistics", component: Statistics },
  ],
});

// Redirect to setup if profile is not set and user is not on login
router.beforeEach((to) => {
  const store = useTrackerStore();
  
  // Allow access to login page unconditionally
  if (to.name === "login") return;

  if (!store.isProfileSet && to.name !== "setup") {
    return { name: "setup" };
  }
});

export default router;
