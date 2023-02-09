import ChatGPTIcon from "../components/ChatGPTIcon";

import { CHATGPT_BTN_ID, Domains, ERROR_MESSAGE } from "../utils/constants";
import {
  getComment,
  delay,
  closestSibling,
  showAPIKeyError,
} from "../utils/shared";
import getConfig from "../utils/config";
import { notyf } from "../chrome/content_script";

export const injector = () => {
  document
    .querySelectorAll(`button[role="button"][type="submit"]`)
    .forEach((el) => {
      const pathname = window.location.pathname;
      if (pathname === "/") return;

      if (el.getAttribute("hasChatGPT") === "true") return;
      el.setAttribute("hasChatGPT", "true");

      // const icon = el?.querySelector("svg");
      // const iconColor = window.getComputedStyle(icon!)?.color || "#8e8e8e";
      const iconColor = "#8e8e8e";

      el?.insertAdjacentHTML(
        "beforebegin",
        `<div id="${CHATGPT_BTN_ID}" role="button" class="reddit">${ChatGPTIcon(
          20,
          iconColor
        )}</div>`
      );
    });
};

export const handler = async () => {
  document.body.addEventListener("click", async (e) => {
    const target = e.target as Element;
    const btn = target?.closest(`#${CHATGPT_BTN_ID}`);
    if (!btn) return;

    const config = await getConfig();
    if (!config?.["social-comments-openapi-key"])
      return showAPIKeyError(Domains.Reddit);

    notyf?.dismissAll();

    const commentInputWrapper = closestSibling(
      btn,
      `[class="DraftEditor-root"]`
    );

    if (!commentInputWrapper) return;
    setTweetText("ChatGPT is thinking...");

    btn.setAttribute("disabled", "true");
    btn.setAttribute("loading", "true");

    // data-adclicklocation="title"
    const title =
      closestSibling(btn, `[data-adclicklocation="title"] h1`)?.textContent ||
      "";
    // data-click-id="text"
    const content =
      closestSibling(btn, `[data-click-id="text"]`)?.textContent || "";

    const comment = await getComment(
      config,
      Domains.Reddit,
      title + " " + content
    );

    console.log(comment);
    if (comment.length) {
      setTweetText(comment);
    } else {
      await delay(1000);
      setTweetText(ERROR_MESSAGE);
    }

    btn.setAttribute("disabled", "false");
    btn.setAttribute("loading", "false");
  });
};

const setTweetText = async (text: string) => {
  const editable = document?.querySelector(`[data-test-id="post-content"]`);

  // find chatgpt-response div
  const chatgptResponse = document?.querySelector(`#chatgpt-response`);
  if (chatgptResponse) {
    chatgptResponse.remove();
  }

  // add div after editable
  editable?.insertAdjacentHTML(
    "afterend",
    `<div id="chatgpt-response" style="margin-top: 10px; margin-bottom: 10px; padding: 10px; border: 1px solid #e1e4e8; border-radius: 5px; background-color: #f6f8fa; color: #24292e; font-size: 14px; line-height: 20px; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';">${text}</div>`
  );
};
