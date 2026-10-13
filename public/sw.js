// Service worker : un petit programme que le téléphone garde en arrière-plan,
// même quand l'app est fermée. Il sert uniquement à recevoir et afficher les notifications.

// Une notification arrive du serveur → on l'affiche.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Traitement chat", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    })
  );
});

// On touche la notification → on remet l'app au premier plan (ou on l'ouvre).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // App déjà ouverte : on la ramène devant.
      for (const w of windows) {
        if ("focus" in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
