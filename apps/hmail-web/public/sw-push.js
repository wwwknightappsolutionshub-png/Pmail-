self.addEventListener("push", (event) => {
  let payload = { title: "PMail+", body: "You have new mail", url: "/" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // keep defaults
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: { url: payload.url },
      icon: "/pwa-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "pmail-mail-sync") {
    event.waitUntil(
      fetch("/api/pwa/mail-sync/trigger", { method: "POST", credentials: "include" }).catch(() => undefined),
    );
  }
});
