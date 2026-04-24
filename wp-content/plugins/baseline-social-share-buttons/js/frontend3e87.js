(function ($) {
  $(document).ready(function () {
    if (!$("#side-share").length || typeof blssVars === "undefined") {
      return false;
    }

    const generatedShortUrls = {};

    async function init() {
      attachListeners();
      await addShortUrlsToButtons();
      saveGeneratedUrlsToWp();
    }

    async function saveGeneratedUrlsToWp() {
      /**
       * we want to save any short urls to post meta
       * so we're not regenerating them with every pageload
       **/
      if ($.isEmptyObject(generatedShortUrls)) {
        return false;
      }

      $.post(blssVars.ajax_url, {
        action: "save_urls_to_post_meta",
        nonce: blssVars.nonce,
        data: {
          _350_share_links: generatedShortUrls,
          post_id: blssVars.post_id,
        },
      });
    }

    async function getShortUrl(longUrl) {
      const body = { longUrl, crawlable: true };
      const url = "https://to.350.org/rest/v3/short-urls";

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            accept: "application/json",
            "X-Api-Key": blssVars.shortKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();
        return data.shortUrl;
      } catch (error) {
        return longUrl;
      }
    }

    function replaceWithShortLink($el, longUrl) {
      const encodedShortUrl = encodeURIComponent($el.attr("data-short-url"));
      const encodedLongUrl = encodeURIComponent(longUrl);
      const currentUrl = $el.attr("href");
      let newUrl = currentUrl.split(encodedLongUrl).join(encodedShortUrl);
      if (currentUrl && currentUrl.startsWith("mailto:")) {
        const paramsString = currentUrl.split("?")[1];
        let decodedParams = decodeURIComponent(paramsString);
        decodedParams = decodedParams.replace(
          longUrl,
          $el.attr("data-short-url")
        );
        const subject = decodedParams.split("&")[0].split("=")[1];
        const body = decodedParams.split("&")[1].split("=")[1];
        newUrl =
          "mailto:?subject=" +
          encodeURIComponent(subject) +
          "&body=" +
          encodeURIComponent(body);
      }
      $el.attr("href", newUrl);
    }

    function getSourceAndPlatform($el) {
      const platforms = {
        "button-share-facebook": "fb",
        "button-share-whatsapp": "wa",
        "button-share-bluesky": "bs",
        "button-share-email": "em",
        "button-share-copy-link": "copylink",
      };

      let platform = "";
      for (const className in platforms) {
        if ($el.hasClass(className)) {
          platform = platforms[className];
          break;
        }
      }

      let source = `share-web-floating-${platform}`;
      const slug = window.location.pathname.replace(/\/$/, "").split("/").pop();

      if (slug) {
        source += `-${slug}`;
      }

      return [source, platform];
    }

    async function addShortUrlsToButtons() {
      const longUrl = $("#side-share").attr("data-long-url");

      const promises = $("#side-share a[data-short-url]")
        .map(async function () {
          const $this = $(this);
          if ($this.attr("data-short-url") == "") {
            const [source, platform] = getSourceAndPlatform($this);
            const shortUrl = await getShortUrl(longUrl + "?source=" + source);
            $this.attr("data-short-url", shortUrl);
            generatedShortUrls[platform] = shortUrl;
          }
          replaceWithShortLink($this, longUrl);
        })
        .get();

      await Promise.all(promises);
    }

    function attachListeners() {
      const $copyLinkButton = $("#side-share .button-share-copy-link");
      $copyLinkButton.on("mouseout", function () {
        $(this).removeClass("clicked").addClass("copied");
      });

      $copyLinkButton.on("click", function (e) {
        const longUrl = $(this).attr("data-short-url");
        e.preventDefault();

        navigator.clipboard.writeText(longUrl).then(() => {
          $(this).removeClass("copied").addClass("clicked");
        });
      });
    }

    init();
  });
})(jQuery);
