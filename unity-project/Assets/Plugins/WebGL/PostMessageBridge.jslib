mergeInto(LibraryManager.library, {
    ReportGameOverToHost: function(jsonStrPtr) {
        var jsonStr = UTF8ToString(jsonStrPtr);
        try {
            var payload = JSON.parse(jsonStr);
            var targetOrigin = window.location.origin;
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(payload, targetOrigin);
            } else {
                window.postMessage(payload, targetOrigin);
            }
            if (typeof window.onUnityGameOver === 'function') {
                window.onUnityGameOver(payload);
            }
        } catch (e) {
            console.error('[PostMessageBridge] Error reporting gameover:', e);
        }
    }
});
