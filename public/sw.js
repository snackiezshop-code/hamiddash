// Service worker for the daily rent-reminder push (see src/lib/push.ts). No offline caching.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "HamidKost", {
      body: data.body || "",
      icon: "/icon.svg",
      tag: "rent-reminders", // a newer day's alert replaces yesterday's
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // ?notif=1 tells the app this page was opened on purpose, so it doesn't jump to Ringkasan.
  const target = new URL(event.notification.data?.url || "/", self.location.origin);
  target.searchParams.set("notif", "1");
  const url = target.href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const open = wins.find((w) => "focus" in w);
      if (open) return open.navigate(url).then((w) => (w || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
