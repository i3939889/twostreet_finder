import { defineConfig } from "playwright/test";

export default defineConfig({
  use: {
    baseURL: "https://store.2ndstreet.com.tw/",
    trace: "retain-on-failure",
  },
});

