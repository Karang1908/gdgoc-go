mergeInto(LibraryManager.library, {
    ReportGameOverToHost: function(jsonStrPtr) {
        var jsonStr = UTF8ToString(jsonStrPtr);
        try {
            if (window.unityInstance && typeof window.unityInstance.SetFullscreen === 'function') {
                window.unityInstance.SetFullscreen(0);
            }
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(function() {});
            }
            var payload = JSON.parse(jsonStr);
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(payload, '*');
            } else {
                window.postMessage(payload, '*');
            }
            if (typeof window.onUnityGameOver === 'function') {
                window.onUnityGameOver(payload);
            }
        } catch (e) {
            console.error('[PostMessageBridge] Error reporting gameover:', e);
        }
    }
});
