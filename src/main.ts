import { createApp } from "vue";
import { createPinia } from "pinia";
import { inject as injectVercelAnalytics } from "@vercel/analytics";
import { i18n } from "./i18n";
import "./style.css";
import App from "./App.vue";
import router from "./router";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(i18n);

// Vercel Web Analytics. The framework-agnostic `inject()` is used instead of the
// `@vercel/analytics/vue` entry because that entry imports vue-router and only
// declares a peer on vue-router@^4, while this app runs vue-router@5.
// Only injected in production builds so dev navigation isn't counted.
if (import.meta.env.PROD) {
  injectVercelAnalytics();
}

app.mount("#app");
