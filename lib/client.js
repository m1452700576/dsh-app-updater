/**
 * dsh-app-updater — browser half.
 * Sidebar icon-only button that checks DSH releases; the panel lets the user
 * paste a custom download URL (validated against a DSH installer whitelist
 * + reachability probe) and always confirms the source before downloading.
 * Works in any browser (incl. HarmonyOS); host handles mac/win/linux open.
 */
window.__ModuleLoader__.load({
  id: "@local/dsh-app-updater",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
    var h = React.createElement;

    var NS = "dshAppUpdate";

    var zh = {
      label: "检查 DSH 更新",
      checking: "正在检查 DSH 更新…",
      current: "当前版本",
      latest: "最新版本",
      cli: "内置 dsh CLI",
      source: "更新源",
      outdated: "发现新版本",
      upToDate: "已是最新版本",
      download: "下载并安装",
      downloading: "正在下载安装包…",
      saving: "正在写入文件…",
      opening: "正在打开安装器…",
      doneTitle: "安装包已下载并打开",
      doneHint: "请退出 DSH 后按安装向导完成升级（无法在运行时替换正在运行的应用）",
      path: "文件位置",
      close: "关闭",
      minimize: "最小化",
      restore: "展开",
      checkFailed: "检查失败",
      noInstaller: "没有找到带安装包的新版本，或 GitHub 暂时不可用。",
      downloadFailed: "下载失败",
      bubbleDownloading: "DSH 更新中",
      bubbleDone: "已下载，点击查看",
      bubbleError: "更新失败，点击查看",
      bubbleReady: "有新版本，点击查看",
      customUrlPlaceholder: "粘贴安装包下载地址（可选，留空则用自动检测）",
      customUrlCheck: "检查地址",
      checkingUrl: "正在检查地址…",
      urlHost: "主机",
      urlFile: "文件名",
      urlSize: "大小",
      urlReachable: "可访问",
      urlOk: "此地址可下载",
      urlWarn: "存在风险，请确认后下载",
      urlBlocked: "地址无效或不可达",
      privateBlocked: "指向本机/内网地址，已禁止下载",
      confirmTitle: "确认下载",
      confirmSource: "来源",
      confirmWarn: "风险提示",
      confirmStart: "确认下载",
      confirmCancel: "取消",
      ignoreVersion: "忽略此版本",
      changelog: "更新日志",
      hideChangelog: "收起日志",
    };
    var en = {
      label: "Check DSH update",
      checking: "Checking DSH update…",
      current: "Current",
      latest: "Latest",
      cli: "Bundled dsh CLI",
      source: "Source",
      outdated: "New version available",
      upToDate: "Already up to date",
      download: "Download & install",
      downloading: "Downloading installer…",
      saving: "Saving file…",
      opening: "Opening installer…",
      doneTitle: "Installer downloaded and opened",
      doneHint: "Quit DSH and finish the upgrade in the installer (a running app cannot replace itself)",
      path: "Location",
      close: "Close",
      minimize: "Minimize",
      restore: "Restore",
      checkFailed: "Check failed",
      noInstaller: "No newer release with an installer was found, or GitHub is unavailable.",
      downloadFailed: "Download failed",
      bubbleDownloading: "DSH updating",
      bubbleDone: "Downloaded - click to view",
      bubbleError: "Update failed - click to view",
      bubbleReady: "New version - click to view",
      customUrlPlaceholder: "Paste an installer download URL (optional; leave empty to use the detected source)",
      customUrlCheck: "Check URL",
      checkingUrl: "Checking URL…",
      urlHost: "Host",
      urlFile: "File",
      urlSize: "Size",
      urlReachable: "Reachable",
      urlOk: "This URL can be downloaded",
      urlWarn: "Risks present - review before downloading",
      urlBlocked: "Invalid or unreachable URL",
      privateBlocked: "Points to local/private address - download blocked",
      confirmTitle: "Confirm download",
      confirmSource: "Source",
      confirmWarn: "Warnings",
      confirmStart: "Confirm & download",
      confirmCancel: "Cancel",
      ignoreVersion: "Ignore this version",
      changelog: "Changelog",
      hideChangelog: "Hide Changelog",
    };

    var L = (typeof navigator !== "undefined" && navigator.language && /^en/i.test(navigator.language)) ? en : zh;

    var styles = {
      button: { display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "0", color: "inherit", cursor: "pointer", padding: "6px 8px", borderRadius: 8, position: "relative" },
      dot: { position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#f5222d", boxShadow: "0 0 0 2px rgba(0,0,0,.35)" },
      overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
      card: { width: 480, maxWidth: "94vw", maxHeight: "84vh", overflowY: "auto", overscrollBehavior: "contain", background: "#1e1e24", color: "#eee", borderRadius: 12, padding: 18, font: "13px/1.5 -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif", boxShadow: "0 12px 40px rgba(0,0,0,.5)" },
      titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
      title: { margin: 0, fontSize: 15, fontWeight: 600 },
      row: { display: "flex", justifyContent: "space-between", padding: "4px 0" },
      rowKey: { color: "#999" },
      rowVal: { fontWeight: 600, wordBreak: "break-all", textAlign: "right", paddingLeft: 12 },
      notes: { whiteSpace: "pre-wrap", background: "rgba(255,255,255,.06)", borderRadius: 8, padding: 10, margin: "10px 0", maxHeight: 160, overflow: "auto", color: "#ccc" },
      input: { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.07)", color: "#eee", border: "1px solid #444", borderRadius: 8, padding: "8px 10px", margin: "8px 0 6px", font: "12px/1.4 inherit" },
      urlBox: { background: "rgba(255,255,255,.05)", border: "1px solid #333", borderRadius: 8, padding: 10, margin: "6px 0" },
      warn: { color: "#ffa940", margin: "4px 0", wordBreak: "break-word" },
      ok: { color: "#95de64", margin: "4px 0" },
      bad: { color: "#ff7875", margin: "4px 0", wordBreak: "break-word" },
      muted: { color: "#888", fontSize: 12 },
      actions: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" },
      primary: { background: "#2f6fed", color: "#fff", border: "0", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 },
      danger: { background: "#c0392b", color: "#fff", border: "0", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600 },
      ghost: { background: "transparent", color: "#bbb", border: "1px solid #444", borderRadius: 8, padding: "8px 14px", cursor: "pointer" },
      barTrack: { height: 8, borderRadius: 4, background: "rgba(255,255,255,.12)", overflow: "hidden", marginTop: 10, position: "relative" },
      barFill: { height: "100%", borderRadius: 4, background: "#2f6fed", transition: "width .3s ease" },
      barIndet: { height: "100%", width: "40%", borderRadius: 4, background: "#2f6fed", animation: "dsh-up-progress 1.2s ease-in-out infinite" },
      bubble: { position: "fixed", right: 16, bottom: 16, zIndex: 10000, background: "#1e1e24", color: "#eee", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,.45)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, font: "12px/1.4 -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif", border: "1px solid #333" },
    };

    function AppUpdateEntry(props) {
      var wide = props.wide;
      function safeGetIgnored() {
        try { return window.localStorage.getItem('dsh-updater-ignored-version'); } catch (e) { return null; }
      }
      function safeSetIgnored(v) {
        try { window.localStorage.setItem('dsh-updater-ignored-version', v); } catch (e) {}
      }
      var state = React.useState({ open: false, minimized: false, view: { kind: "idle" }, available: false, progress: null, customUrl: "", urlCheck: null, confirming: false, showChangelog: false });
      var open = state[0].open;
      var minimized = state[0].minimized;
      var view = state[0].view;
      var available = state[0].available;
      var progress = state[0].progress;
      var customUrl = state[0].customUrl;
      var urlCheck = state[0].urlCheck;
      var confirming = state[0].confirming;
      var showChangelog = state[0].showChangelog;
      var set = state[1];
      
      // Background startup check
      React.useEffect(function() {
        var ignored = safeGetIgnored();
        fetch("/api/dsh-update/status")
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data && data.outdated) {
              // If we have an ignored version, check if it matches the latest
              if (ignored && ignored === data.latest) {
                console.log('[dsh-app-updater] Ignoring version:', data.latest);
                // Still update state to "result" but keep available=false?
                // Or just don't update available.
                // Let's keep the state but mark it as ignored so we can show it if user clicks manually.
                set(function(s) { return Object.assign({}, s, { view: { kind: "result", data: data } }); });
              } else {
                set(function(s) { return Object.assign({}, s, { available: true, view: { kind: "result", data: data } }); });
              }
            }
          })
          .catch(function() {});
      }, []);

      var probe = React.useCallback(function () {
        fetch("/api/dsh-update/status").then(function (r) { return r.json(); }).then(function (data) {
          set(function (s) {
            var ignored = safeGetIgnored();
            var showDot = !!data.outdated && !(ignored && ignored === data.latest);
            return { open: s.open, minimized: s.minimized, view: s.view, available: showDot, progress: s.progress, customUrl: s.customUrl, urlCheck: s.urlCheck, confirming: s.confirming, showChangelog: s.showChangelog };
          });
        }).catch(function () {});
      }, []);
      React.useEffect(function () { probe(); }, [probe]);

      function openPanel() {
        set({ open: true, minimized: false, view: { kind: "checking" }, available: available, progress: progress, customUrl: "", urlCheck: null, confirming: false, showChangelog: false });
        fetch("/api/dsh-update/status").then(function (r) { return r.json(); }).then(function (data) {
          set(function (s) {
            var ignored = safeGetIgnored();
            var showDot = !!data.outdated && !(ignored && ignored === data.latest);
            return { open: true, minimized: false, view: data.error ? { kind: "error", message: data.error } : { kind: "result", data: data }, available: showDot, progress: s.progress, customUrl: "", urlCheck: null, confirming: false, showChangelog: s.showChangelog };
          });
        }).catch(function (e) {
          set(function (s) { return { open: true, minimized: false, view: { kind: "error", message: String(e) }, available: s.available, progress: s.progress, customUrl: "", urlCheck: null, confirming: false, showChangelog: s.showChangelog }; });
        });
      }

      function minimize() { set(function (s) { return Object.assign({}, s, { open: false, minimized: true, confirming: false }); }); }
      function restore() { set(function (s) { return Object.assign({}, s, { open: true, minimized: false }); }); }
      function toggleChangelog() { set(function (s) { return Object.assign({}, s, { showChangelog: !s.showChangelog }); }); }

      function checkUrl() {
        var url = customUrl.trim();
        if (url === "") return;
        set(function (s) { return { open: true, minimized: false, view: { kind: "checking-url" }, available: s.available, progress: s.progress, customUrl: s.customUrl, urlCheck: null, confirming: false }; });
        fetch("/api/dsh-update/url-check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: url }) })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            set(function (s) { return { open: true, minimized: false, view: s.view, available: s.available, progress: s.progress, customUrl: s.customUrl, urlCheck: data, confirming: false }; });
          })
          .catch(function (e) {
            set(function (s) { return { open: true, minimized: false, view: { kind: "error", message: String(e) }, available: s.available, progress: s.progress, customUrl: s.customUrl, urlCheck: null, confirming: false }; });
          });
      }

      function startConfirm() { set(function (s) { return { open: true, minimized: false, view: s.view, available: s.available, progress: s.progress, customUrl: s.customUrl, urlCheck: s.urlCheck, confirming: true }; }); }
      function cancelConfirm() { set(function (s) { return { open: true, minimized: false, view: s.view, available: s.available, progress: s.progress, customUrl: s.customUrl, urlCheck: s.urlCheck, confirming: false }; }); }

      function download() {
        set({ open: true, minimized: false, view: { kind: "downloading" }, available: available, progress: { phase: "downloading", done: 0, total: 0, fileName: null }, customUrl: customUrl, urlCheck: null, confirming: false, showChangelog: false });
        var timer = window.setInterval(function () {
          fetch("/api/dsh-update/progress").then(function (r) { return r.json(); }).then(function (p) {
            set(function (s) { return { open: s.open, minimized: s.minimized, view: s.view, available: s.available, progress: p, customUrl: s.customUrl, urlCheck: s.urlCheck, confirming: s.confirming }; });
          }).catch(function () {});
        }, 500);
        var body = customUrl.trim() !== "" ? JSON.stringify({ url: customUrl.trim() }) : undefined;
        fetch("/api/dsh-update/download", { method: "POST", ...(body ? { headers: { "content-type": "application/json" }, body: body } : {}) })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            window.clearInterval(timer);
            if (data.ok) {
              set(function (s) { return { open: true, minimized: false, view: { kind: "done", file: data.file, repo: data.repo }, available: false, progress: { phase: "done", done: data.bytes, total: data.bytes, fileName: data.file }, customUrl: s.customUrl, urlCheck: null, confirming: false }; });
            } else {
              set(function (s) { return { open: true, minimized: false, view: { kind: "error", message: data.code === "nothing-to-download" ? L.noInstaller : (data.error || L.downloadFailed) }, available: s.available, progress: null, customUrl: s.customUrl, urlCheck: null, confirming: false }; });
            }
          })
          .catch(function (e) {
            window.clearInterval(timer);
            set(function (s) { return { open: true, minimized: false, view: { kind: "error", message: String(e) }, available: s.available, progress: null, customUrl: s.customUrl, urlCheck: null, confirming: false }; });
          });
      }

      var pct = null;
      if (progress && progress.total > 0) pct = Math.max(0, Math.min(100, Math.round((progress.done || 0) / progress.total * 100)));
      function statusLine() {
        if (!progress) return L.downloading;
        if (progress.phase === "saving") return L.saving;
        if (progress.phase === "opening") return L.opening;
        if (progress.phase === "done") return L.doneTitle;
        var label = progress.fileName ? progress.fileName : L.downloading;
        return label + (pct !== null ? " " + pct + "%" : " …");
      }
      function bar() {
        if (!progress) return null;
        if (pct !== null) return h("div", { style: styles.barTrack }, h("div", { style: Object.assign({}, styles.barFill, { width: pct + "%" }) }));
        return h("div", { style: styles.barTrack }, h("div", { style: styles.barIndet }));
      }

      function formatSize(n) {
        if (!n) return "?";
        if (n > 1024 * 1024 * 1024) return (n / (1024 * 1024 * 1024)).toFixed(1) + " GB";
        if (n > 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + " MB";
        if (n > 1024) return (n / 1024).toFixed(1) + " KB";
        return String(n) + " B";
      }

      var panel = null;
      if (open) {
        var body;
        if (view.kind === "downloading") {
          body = [ h("p", { key: "t", style: { margin: "4px 0" } }, statusLine()), bar(), h("p", { key: "h", style: styles.muted }, L.doneHint) ];
        } else if (view.kind === "checking") {
          body = h("p", { key: "c", style: { margin: "4px 0" } }, L.checking);
        } else if (view.kind === "checking-url") {
          body = h("p", { key: "c", style: { margin: "4px 0" } }, L.checkingUrl);
        } else if (view.kind === "result") {
          var d = view.data;
          var urlCheckBox = null;
          if (urlCheck) {
            var warnLines = (Array.isArray(urlCheck.warnings) ? urlCheck.warnings : []);
            var urlGood = urlCheck.reachable && urlCheck.looksLikeDsh && urlCheck.isInstallerExt && !urlCheck.privateHost && warnLines.length === 0;
            var checkNodes = [
              h("div", { key: "h", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.urlHost), h("span", { key: "v", style: styles.rowVal }, urlCheck.host || "?")]),
              h("div", { key: "f", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.urlFile), h("span", { key: "v", style: styles.rowVal }, urlCheck.filename || "?")]),
              h("div", { key: "z", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.urlSize), h("span", { key: "v", style: styles.rowVal }, formatSize(urlCheck.size))]),
            ];
            if (urlCheck.privateHost) checkNodes.push(h("div", { key: "priv", style: styles.bad }, "⛔ " + L.privateBlocked));
            if (warnLines.length > 0) warnLines.forEach(function (wline, i) { checkNodes.push(h("div", { key: "w" + i, style: styles.warn }, "⚠ " + wline)); });
            checkNodes.push(h("div", { key: "s", style: urlGood ? styles.ok : styles.bad }, urlGood ? L.urlOk : L.urlWarn));
            urlCheckBox = h("div", { key: "urlbox", style: styles.urlBox }, checkNodes);
          }
          body = [
            d.outdated ? h("p", { key: "head", style: styles.ok }, L.outdated + " " + (d.latest || "")) : null,
            h("div", { key: "cur", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.current), h("span", { key: "v", style: styles.rowVal }, d.current)]),
            h("div", { key: "lat", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.latest), h("span", { key: "v", style: styles.rowVal }, d.latest || "—")]),
            d.cli ? h("div", { key: "cli", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.cli), h("span", { key: "v", style: styles.rowVal }, d.cli)]) : null,
            h("div", { key: "src", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.source), h("span", { key: "v", style: styles.muted }, d.source)]),
            d.notes ? h("div", { key: "notes-toggle", style: { marginTop: 8 } }, 
              h("button", { style: Object.assign({}, styles.ghost, { fontSize: 12, padding: "4px 8px" }), onClick: toggleChangelog }, showChangelog ? L.hideChangelog : L.changelog)
            ) : null,
            showChangelog && d.notes ? h("div", { key: "notes", style: styles.notes }, String(d.notes).slice(0, 2000)) : null,
            h("input", { key: "in", style: styles.input, placeholder: L.customUrlPlaceholder, value: customUrl, onChange: function (e) { set(function (s) { return { open: true, minimized: false, view: s.view, available: s.available, progress: s.progress, customUrl: e.target.value, urlCheck: null, confirming: false }; }); } }),
            h("div", { key: "urow", style: styles.actions }, h("button", { style: styles.ghost, onClick: checkUrl, disabled: customUrl.trim() === "" }, L.customUrlCheck)),
            urlCheckBox,
            (d.outdated || (urlCheck && urlCheck.reachable && !urlCheck.privateHost))
              ? h("div", { key: "dl", style: styles.actions }, 
                  h("button", { style: styles.primary, onClick: startConfirm }, L.download),
                  d.outdated ? h("button", { style: Object.assign({}, styles.ghost, { marginLeft: 8 }), onClick: function() { 
                    safeSetIgnored(d.latest);
                    set(function(s) { return Object.assign({}, s, { available: false }); });
                  } }, L.ignoreVersion) : null
                )
              : h("p", { key: "ok", style: styles.ok }, L.upToDate),
            (d.errors && d.errors.length) ? h("details", { key: "errs", style: styles.muted }, [
              h("summary", { key: "s" }, "探测详情 (" + d.errors.length + ")"),
              h("ul", { key: "u", style: { paddingLeft: 16, margin: "6px 0" } }, d.errors.map(function (e, i) { return h("li", { key: i }, String(e)); })),
            ]) : null,
          ];
        } else if (view.kind === "done") {
          body = [
            h("p", { key: "t", style: styles.ok }, L.doneTitle),
            h("p", { key: "p", style: Object.assign({}, styles.muted, { wordBreak: "break-all" }) }, L.path + ": " + view.file),
            view.repo ? h("p", { key: "r", style: styles.muted }, "github: " + view.repo) : null,
            view.sha256 ? h("p", { key: "sha", style: Object.assign({}, styles.muted, { wordBreak: "break-all" }) }, "SHA-256: " + view.sha256) : null,
            view.checksumVerified !== null && view.checksumVerified !== undefined ? h("p", { key: "chk", style: view.checksumVerified ? styles.ok : styles.bad }, (view.checksumVerified ? "✓ 校验和已验证" : "校验和未通过")) : null,
            h("p", { key: "h", style: styles.muted }, L.doneHint),
          ];
        } else {
          body = h("p", { key: "e", style: styles.bad }, (L.checkFailed + ": " + (view.message || "")));
        }

        // Confirmation overlay (step ④)
        if (confirming && (view.kind === "result")) {
          var d2 = view.data;
          var sourceLine = customUrl.trim() !== "" ? (urlCheck ? (urlCheck.host + (urlCheck.filename ? " / " + urlCheck.filename : "")) : customUrl) : (d2.source || "auto");
          var warnLines2 = urlCheck && Array.isArray(urlCheck.warnings) ? urlCheck.warnings : [];
          var confirmBody = [
            h("div", { key: "src", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.confirmSource), h("span", { key: "v", style: Object.assign({}, styles.rowVal, { maxWidth: 300 }) }, sourceLine)]),
          ];
          if (urlCheck && urlCheck.size) confirmBody.push(h("div", { key: "size", style: styles.row }, [h("span", { key: "k", style: styles.rowKey }, L.urlSize), h("span", { key: "v", style: styles.rowVal }, formatSize(urlCheck.size))]));
          if (urlCheck && urlCheck.privateHost) confirmBody.push(h("div", { key: "priv", style: styles.bad }, "⛔ " + L.privateBlocked));
          if (warnLines2.length > 0) {
            confirmBody.push(h("div", { key: "wtitle", style: styles.warn }, "⚠ " + L.confirmWarn));
            warnLines2.forEach(function (wline, i) { confirmBody.push(h("div", { key: "w" + i, style: styles.warn }, "• " + wline)); });
          }
          confirmBody.push(h("div", { key: "actions", style: styles.actions },
            h("button", { key: "ok", style: warnLines2.length > 0 ? styles.danger : styles.primary, onClick: download }, L.confirmStart),
            h("button", { key: "no", style: styles.ghost, onClick: cancelConfirm }, L.confirmCancel)
          ));
          panel = h("div", { style: styles.overlay, onClick: function (e) { if (e.target === e.currentTarget) cancelConfirm(); } },
            h("div", { style: styles.card },
              h("h3", { style: styles.title }, L.confirmTitle),
              confirmBody
            )
          );
        } else {
          panel = h("div", { style: styles.overlay, onClick: function (e) { if (e.target === e.currentTarget) set({ open: false, minimized: false, view: view, available: available, progress: progress, customUrl: customUrl, urlCheck: urlCheck, confirming: false, showChangelog: showChangelog }); } },
            h("div", { style: styles.card },
              h("div", { style: styles.titleRow },
                h("h3", { style: styles.title }, L.label),
                h("button", { style: Object.assign({}, styles.ghost, { padding: "4px 10px", marginLeft: 8 }), onClick: minimize, title: L.minimize }, "—")
              ),
              body,
              h("div", { style: styles.actions },
                h("button", { style: styles.ghost, onClick: minimize }, L.minimize),
                h("button", { style: styles.ghost, onClick: function () { set({ open: false, minimized: false, view: view, available: available, progress: progress, customUrl: customUrl, urlCheck: urlCheck, confirming: false, showChangelog: showChangelog }); } }, L.close)
              )
            )
          );
        }
      }

      var bubble = null;
      if (!open && minimized && view.kind !== "idle") {
        var text;
        if (view.kind === "downloading") text = L.bubbleDownloading + (pct !== null ? " " + pct + "%" : " …");
        else if (view.kind === "done") text = L.bubbleDone;
        else if (view.kind === "error") text = L.bubbleError;
        else if (view.kind === "result" && available) text = L.bubbleReady;
        else text = L.label;
        bubble = h("div", { style: styles.bubble, onClick: restore, title: L.restore }, h("span", { style: { fontSize: 14 } }, "⬆"), h("span", null, text));
      }

      return h(React.Fragment, null,
        h("button", { type: "button", style: styles.button, title: L.label, "aria-label": L.label, onClick: openPanel, "data-dsh-update-available": available ? "true" : undefined },
          h("span", { style: { fontSize: 14 } }, "⬆"),
          available ? h("span", { style: styles.dot }) : null
        ),
        panel,
        bubble
      );
    }

    function apply(ctx) {
      ctx.effect(function () {
        try { return ctx.locale.register(NS, { zh: zh, en: en }); } catch (e) { return function () {}; }
      }, "dsh-app-updater: dictionaries");
      try {
        if (!document.getElementById("dsh-app-updater-styles")) {
          var st = document.createElement("style");
          st.id = "dsh-app-updater-styles";
          st.textContent = "@keyframes dsh-up-progress{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}";
          document.head.appendChild(st);
        }
      } catch (e) { /* ignore */ }
      ctx.slots.inject("sidebar.footer.action", function () {
        var dispose = undefined;
        try {
          dispose = ctx.slots.register({ name: "sidebar.footer.action", id: "dsh-app-updater", locale: NS }, AppUpdateEntry);
        } catch (e) { /* ignore */ }
        return function () { if (dispose) dispose(); };
      });
    }

    var inject = ["slots", "locale"];
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});