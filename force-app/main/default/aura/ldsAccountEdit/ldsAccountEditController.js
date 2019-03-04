({
    handleSaveRecord: function (component, event, helper) {
        var recordEditor = component.find("recordEditor");
        recordEditor.saveRecord($A.getCallback(function (saveResult) {
            if (saveResult.state === "ERROR") {
                var errMsg = "";
                for (var err of saveResult.error) {
                    errMsg += err.message + "\n";
                }
                component.set("v.recordError", errMsg);
            } else {
                component.set("v.recordError", "");
                $A.get("e.force:closeQuickAction").fire();
            }
        }));
    },

    handleRecordUpdated: function (component, event, helper) {
        var eventParams = event.getParams();
        if (eventParams.changeType === "CHANGED") {
            var changedFields = eventParams.changedFields;
            console.log('Fields that are changed: ' + JSON.stringify(changedFields));
            var resultsToast = $A.get("e.force:showToast");
            resultsToast.setParams({
                "title": "Saved",
                "message": "The record was updated."
            });
            resultsToast.fire();
        } else if (eventParams.changeType === "LOADED") {
            // record is loaded in the cache
        } else if (eventParams.changeType === "REMOVED") {
            // record is deleted and removed from the cache
        } else if (eventParams.changeType === "ERROR") {
            console.log('Error: ' + component.get("v.error"));
        }
    }
})
