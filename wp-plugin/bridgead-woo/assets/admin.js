/* global BridgeAdAdmin, jQuery */
(function ($) {
  "use strict";

  function esc(s) {
    return $("<div>")
      .text(s == null ? "" : String(s))
      .html();
  }

  $(function () {
    $("#bridgead-verify").on("click", function () {
      var $btn = $(this);
      var $status = $("#bridgead-status");

      $btn.prop("disabled", true);
      $status.removeClass("is-ok is-failed is-idle").addClass("is-checking");
      $status.find(".label").text(BridgeAdAdmin.i18n.checking);

      $.post(BridgeAdAdmin.ajaxUrl, {
        action: "bridgead_verify",
        _wpnonce: BridgeAdAdmin.nonce,
      })
        .done(function (res) {
          if (res && res.success) {
            $status.removeClass("is-checking").addClass("is-ok");
            $status.find(".label").text(BridgeAdAdmin.i18n.connected);

            var d = res.data || {};
            var rows =
              "<table><tbody>" +
              "<tr><th>סטטוס האתר</th><td>" +
              esc(d.siteStatus || "—") +
              "</td></tr>" +
              "<tr><th>שותפויות פעילות</th><td>" +
              esc(d.linksLive != null ? d.linksLive : "—") +
              "</td></tr>" +
              "</tbody></table>";
            $(".bridgead-site-status").html(rows);
            $("#bridgead-summary").prop("hidden", false);
          } else {
            fail(res && res.data && res.data.message);
          }
        })
        .fail(function () {
          fail();
        })
        .always(function () {
          $btn.prop("disabled", false);
        });

      function fail(msg) {
        $status.removeClass("is-checking").addClass("is-failed");
        $status.find(".label").text(BridgeAdAdmin.i18n.failed + (msg ? " — " + msg : ""));
      }
    });
  });
})(jQuery);
