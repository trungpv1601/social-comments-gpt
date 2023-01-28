import { version } from "react";
import { ANNOUNCEMENTS_API, Domains } from "./constants";

type Announcement = {
  id: string;
  message: string;
  title: string;
  version: number;
};

export const ANNOUNCEMENT_ALERT_WRAPPER = "social-comments-gpt-alert";
const PREFIX = "social-comments-gpt-announcement-";

export default (domain: Domains) => {
  document.body.addEventListener("click", async (e) => {
    const target = e.target as Element;
    const btn = target?.closest(`.${ANNOUNCEMENT_ALERT_WRAPPER} .close-btn`);
    if (!btn) return;

    target?.closest(`.${ANNOUNCEMENT_ALERT_WRAPPER}`)?.remove();

    const announcementId = generateAnnouncementId(
      btn.getAttribute("announcement-id") || "",
      domain
    );

    chrome.storage.local.set({ [announcementId]: true }).catch(() => {
      console.warn(`useChromeStorage set error: ${announcementId}`);
    });
  });

  (async () => {
    const manifestData = chrome.runtime.getManifest();
    const currentVersion = manifestData.version;

    const options = {
      method: "POST",
    };

    const resp = await fetch(
      ANNOUNCEMENTS_API + `?version=${currentVersion}`,
      options
    );

    const announcements: Announcement[] = await resp.json();

    let latestAnnouncements = announcements.filter(
      (a) => a.version >= parseFloat(currentVersion)
    );

    latestAnnouncements = await asyncFilter(latestAnnouncements, async (a) => {
      const isRead = await isAnnouncementRead(
        generateAnnouncementId(a.id, domain)
      );
      return !isRead;
    });

    const allAnnouncements = latestAnnouncements
      .map(
        (a) =>
          `<div class="${ANNOUNCEMENT_ALERT_WRAPPER}">
            <div class="close-btn" announcement-id="${a.id}"></div>
            <p class="title">${a.title}</p>
            <p>${a.message}</p>
          </div>`
      )
      .join("");

    switch (domain) {
      case Domains.LinkedIn:
        document
          .querySelector("#ember32")
          ?.insertAdjacentHTML("afterend", allAnnouncements);
        break;
      case Domains.Instagram:
        document
          .querySelectorAll(`[data-visualcompletion="loading-state"]`)?.[1]
          ?.parentElement?.insertAdjacentHTML("beforebegin", allAnnouncements);
        break;
    }
  })();
};

const isAnnouncementRead = (announcementId: string): Promise<boolean> => {
  return new Promise((resolve, reject) =>
    chrome.storage.local.get([announcementId], (result) => {
      resolve(`${announcementId}` in result);
    })
  );
};

const generateAnnouncementId = (id: string, domain: Domains) =>
  `${PREFIX}-${id}-${domain}`;

const asyncFilter = async <T>(
  arr: T[],
  predicate: (v: T) => void
): Promise<T[]> => {
  const results = await Promise.all(arr.map(predicate));

  return arr.filter((_v: any, index: any) => results[index]);
};
