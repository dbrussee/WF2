window.app = {
    colors: {
        halo: "olivedrab",
        doneLine: "dodgerblue",
        notDoneLine: "saddlebrown",
        doneFill: "lightcyan",
        pillDone: "lightgreen",
        blockedFill: "snow",
        activeFill: "gold",
        dragFill: "khaki"
    },
    pendingAction: null,
    editing: false,
    mode: "work" // or "design"
}
app.toggleMode = function(mode) {
    if (mode == undefined) {
        if (app.mode == "work") {
            app.mode = "design";
        } else {
            app.mode = "work";
        }
    } else {
        app.mode = mode;
    }
    document.getElementById("topForm").style.backgroundColor = (app.mode == "work" ? "gainsboro" : "transparent");
    document.getElementById("locModeName").innerHTML = app.mode;
    if (WF.pickedItem == null) {
        app.cancelAction(true);
    } else {
        app.cancelAction(false);
        app.editItem();
    }
}
app.toast = function(msg, isError) {
    if (isError == undefined) isError = false;
    if (msg == undefined) msg = "";
    var loc = document.getElementById("locToastMessage");
    loc.style.color = (isError ? "red" : "brown");
    loc.style.backgroundColor = (isError ? "yellow" : "transparent");
    loc.style.paddingLeft = (isError ? ".3em" : "0");
    loc.style.paddingRight = (isError ? ".3em" : "0");
    if (app.toastTimer != null) window.clearTimeout(app.toastTimer);
    if (msg == "") {
        loc.innerHTML = "";
        app.toastTimer = null;
    } else {
        loc.innerHTML = "..." + msg;
        app.toastTimer = window.setTimeout(function() {
            app.toast();
        }, 4000);
    }
}
app.askToAddNewItem = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    app.pendingAction = {action:"addItem"};
    var sel = document.getElementById("selNewItemShape");
    sel.value = (app.isCollectionEmpty(WF.flow.items) ? "pill" : "box");
    document.getElementById("txtNewItemName").value = "";

    document.getElementById("locConfirmAddItem").style.display = "";
}
app.confirmAddNewItem = function(x, y) {
    WF.pushTransaction();
    var name = document.getElementById("txtNewItemName").value.trim();
    if (name == "") name = "New";
    var type = document.getElementById("selNewItemShape").value;
    WF.pickedItem = WF.addItem(x, y, type, name);
    WF.popTransaction();
    app.mode = "design";
    app.editItem();
}

app.editItem = function() {
    app.editing = true;
    app.cancelAction();
    if (app.mode == "design") {
        document.getElementById("itemEditor").style.display = "none";
        if (app.isCollectionEmpty(WF.flow.items) || WF.pickedItem == null) {
            document.getElementById("itemDetailEditor").style.display = "none";
        } else {
            document.getElementById("itemDetailEditor").style.display = "";
        }
    } else {
        if (app.isCollectionEmpty(WF.flow.items)) {
            document.getElementById("itemEditor").style.display = "none";
            app.editing = false;
            //app.askToLoadFlow();
        } else {
            document.getElementById("itemEditor").style.display = "";
        }
        document.getElementById("itemDetailEditor").style.display = "none";
    }
    if (!app.editing) return;
    var itm = WF.pickedItem;
    if (itm == null) {
        app.hideEditor();
        return;
    }
    var frm = document.getElementById("frmWF");
    frm.elements.namedItem("det_item_title").value = itm.title;
    document.getElementById("item_title").innerHTML = itm.title;
    var loc = document.getElementById("locCompleteOptions");
    loc.innerHTML = ""; // Get rid of prior options... leaving the Not completed option there
    var cantChange = !itm.canChangeComplete();
    var inco = document.getElementById("item_not_completed_option");
    inco.checked = !itm.completed;
    if (itm.completed && cantChange) {
        //inco.disabled = true;
    } else {
        inco.disabled = false;
    }
    var doneCodeCount = 0;
    var tbl = document.getElementById("tbl_done_codes");
    while (tbl.rows.length > 1) tbl.deleteRow(1);
    for (var key in itm.doneCodes) {
        var oneCode = itm.doneCodes[key];
        var chk = (itm.doneCode == key ? " checked" : "");
        var dis = "";
        if (itm.completed) {
            //if (cantChange) dis = " disabled";
        } else {
            if (itm.isBlocked()) dis = "disabled";
        }
        var h = "<br/><label><input style='margin-right:.2em;' type='radio'" + chk + dis;
        h += " onchange='app.updateItemComplete(this)'";
        h += " name='item_complete'";
        h += " value='" + key + "'>" + oneCode.value + "</label>";
        loc.innerHTML += h;

        var tr = tbl.insertRow();
        tr.onclick = function() {app.editDoneCode(this);}
        var td = tr.insertCell();
        td.innerHTML = key;
        td.className = "anchor";
        td = tr.insertCell();
        td.innerHTML = oneCode.value;
        td.className = "anchor";

        doneCodeCount++;
    }
    if (doneCodeCount == 0) {
        var chk = (itm.completed ? " checked" : "");
        var dis = "";
        if (itm.completed) {
            //if (cantChange) dis = " disabled";
        } else {
            if (itm.isBlocked()) dis = "disabled";
        }
        var h = "<br/><label><input style='margin-right:.2em;' type='radio'" + chk + dis;
        h += " onchange='app.updateItemComplete(this)'";
        h += " name='item_complete'";
        h += " value='Y'>Completed</label>";
        loc.innerHTML += h;
    }
    //document.getElementById("locCannotUncompleteMessage").style.display = (itm.canChangeComplete() ? "none" : "");
    if (itm.unblockIfAnyCompleted) {
        document.getElementById("item_block_type_any").checked = true;
    } else {
        document.getElementById("item_block_type_all").checked = true;
    }
    frm.elements.namedItem("item_shape").value = itm.shape;
    // Blocks / Blocked Bys
    var loc = document.getElementById("locBlockedByList");
    loc.innerHTML = "";
    for (var id in itm.blockedBy) {
        var other = WF.flow.items[id];
        var title = other.title;
        var allowCodes = itm.blockedBy[other.id].allowCodes;
        if (allowCodes != null) title += " (" + allowCodes + ")";
        var link = "<div style='width:100%; padding-bottom:.2em; margin-bottom:.3em; border-bottom:1px dotted silver;'>";
        link += "<span class='anchor' onclick='app.askToRemoveLink(\"blockBy\"," + other.id + ")' style='color:red;font-weight:bold'>&times;</span>";
        link += " <span class='anchor' onclick='app.editLink(\"blockedby\"," + other.id + ")'>" + title + "</span>";
        link += "</div>";
        loc.innerHTML += link;
    }
    var loc = document.getElementById("locBlocksList");
    loc.innerHTML = "";
    for (var id in itm.blocks) {
        var other = WF.flow.items[id];
        var title = other.title;
        var allowCodes = other.blockedBy[itm.id].allowCodes;
        if (allowCodes != null) title += " (" + allowCodes + ")";
        var link = "<div style='width:100%; padding-bottom:.2em; margin-bottom:.3em; border-bottom:1px dotted silver;'>";
        link += "<span class='anchor' onclick='app.askToRemoveLink(\"blocks\"," + other.id + ")' style='color:red;font-weight:bold'>&times;</span>";
        link += " <span class='anchor' onclick='app.editLink(\"blocks\"," + other.id + ")'>" + title + "</span>";
        link += "</div>";
        loc.innerHTML += link;
    }
}
app.hideEditor = function() {
    app.editing = false;
    document.getElementById("itemEditor").style.display = "none";
    document.getElementById("itemDetailEditor").style.display = "none";
}
app.editDoneCode = function(el) {
    app.cancelAction();
    var code = null;
    var val = "";
    if (el != undefined) { // click event is tied to the TR element
        code = el.cells[0].innerText;
        val = el.cells[1].innerText;
    }
    document.getElementById("txtEditDoneCode").value = (code == null ? "" : code);
    document.getElementById("txtEditDoneValue").value = val;
    app.pendingAction = {action:"editDoneCode", code:code, value:val};
    document.getElementById("locEditDoneCode").style.display = "";
}
app.setDoneCode = function() {
    var codes = WF.pickedItem.doneCodes;
    var act = app.pendingAction;
    var newCode = document.getElementById("txtEditDoneCode").value.trim();
    var newVal = document.getElementById("txtEditDoneValue").value.trim();
    if (act.code == null) {
        if (newCode == "") {
            app.cancelAction();
        } else {
            if (codes[newCode] != null) {
                app.toast("That done code is already used on this item", true);
            } else {
                codes[newCode] = {code:newCode, value:newVal}
                app.editItem();
            }
        }
    } else {
        if (newCode == "") {
            delete codes[act.code];
            app.editItem();
        } else {
            if (newCode == act.code) {
                codes[act.code].value = newVal;
                app.editItem();
            } else if (codes[newCode] != null) {
                app.toast("That done code is already used on this item", true);
            } else {
                delete codes[act.code];
                codes[newCode] = {code:newCode, value:newVal}
                app.editItem();
            }
        }
    }
    WF.drawCanvas();
}
app.askToAddLink = function(type) {
    app.cancelAction(false);
    app.pendingAction = {action:"addLink", type:type};
    document.getElementById("locConfirmAddLink").style.display = "";
    var msg = "Add " + (type == "blocks" ? "blocking " : "blocked by ") + " link to ";
    msg += "'" + WF.pickedItem.title + "' by clicking on the other item";
    document.getElementById("locConfirmAddLinkMessage").innerHTML = msg;

}
app.saveEditedLink = function() {
    var blockingItem = app.pendingAction.blocking;
    var blockedItem = app.pendingAction.blocked;
    var frm = document.getElementById("locEditLink");
    var chks = frm.elements['editLinkRow[]'];
    var rslt = "";
    if (chks == undefined) {
        rslt = "";
    } else {
        if (chks.length == undefined) { // Not a list... just a ceheckbox
            rslt = chks.value;
        } else {
            for (var i = 0; i < chks.length; i++) {
                var chk = chks[i];
                if (chk.checked) {
                    if (rslt != "") rslt += ",";
                    rslt += chk.value;
                }
            }
        }
    }
    if (rslt == "") rslt = null;
    blockedItem.blockedBy[blockingItem.id].allowCodes = rslt;
    app.editItem();
    WF.drawCanvas();
    //app.toast(rslt);
}
app.editLink = function(type,toItem) {
    app.cancelAction();
    var blockedItem = null;
    var blockingItem = null;
    toItem = WF.flow.items[toItem];
    if (type == "blocks") {
        blockedItem = toItem;
        blockingItem = WF.pickedItem;
    } else {
        blockedItem = WF.pickedItem;
        blockingItem = toItem;
    }
    var tbl = document.getElementById("tbl_link_codes");
    while (tbl.rows.length > 1) tbl.deleteRow(1);
    var numCodes = 0;
    for (var key in blockingItem.doneCodes) {
        var oneCode = blockingItem.doneCodes[key];
        numCodes++;
        var chk = false; // See if this code is already marked as an allowed code
        var allowCodes = blockedItem.blockedBy[blockingItem.id].allowCodes;
        if (allowCodes != null) {
            var lst = allowCodes.split(",");
            if (lst.indexOf(key) >= 0) chk = true;
        }
        var tr = tbl.insertRow();
        var td = tr.insertCell();
        var cbox = document.createElement("input");
        cbox.checked = chk;
        cbox.type = "checkbox";
        cbox.name = "editLinkRow[]";
        cbox.value = key;
        td.appendChild(cbox);
        td = tr.insertCell();
        td.innerHTML = key;
        td.className = "anchor";
        td = tr.insertCell();
        td.innerHTML = oneCode.value;
        td.className = "anchor";
    }
    if (numCodes == 0) {
        app.askToRemoveLink(type, toItem.id);
    } else {
        var msg = "Edit link from '" + blockingItem.title + "' to '" + blockedItem.title + "'";
        app.pendingAction = {action:"editLink", blocked:blockedItem, blocking:blockingItem};
        document.getElementById("locEditLink").style.display = "";
        document.getElementById("locEditLinkMessage").innerHTML = msg;
    }
}
app.askToRemoveLink = function(type, id) {
    app.cancelAction(false);
    app.pendingAction = {action:"removeLink", type:type, id:id};
    document.getElementById("locConfirmRemoveLink").style.display = "";
    var msg = "Remove " + (type == "blocks" ? "blocking " : "blocked by ") + " link to ";
    var itm = WF.flow.items[id];
    msg += "'" + itm.title + "'";
    document.getElementById("locConfirmRemoveLinkMessage").innerHTML = msg;
}
app.confirmAddLink = function(itm) {
    var added = false;
    if (itm != null) {
        if (itm == WF.pickedItem) {
            app.toast("You cannot link an item to itself", true);
        } else {
            var hasDoneCodes = false;
            var action = app.pendingAction.type;
            if (action == "blocks") {
                added = WF.pickedItem.addBlock(itm);
                if (!app.isCollectionEmpty(WF.pickedItem.doneCodes))  hasDoneCodes = true;
            } else {
                added = WF.pickedItem.addBlockedBy(itm);
                if (!app.isCollectionEmpty(itm.doneCodes))  hasDoneCodes = true;
            }
            if (added) {
                WF.drawCanvas();
                app.editItem();
                app.cancelAction(); 
                if (hasDoneCodes) {
                    app.editLink(action, itm.id);
                }
            } else {
                if (!added) app.toast("Link already present", true);
            }
        }
    } else {
        app.toast("Add link cancelled");
        app.cancelAction();
    }

}
app.confirmRemoveLink = function() {
    var type = app.pendingAction.type;
    var id = app.pendingAction.id;
    if (type == "blocks") {
        WF.pickedItem.removeBlock(WF.flow.items[id]);
    } else {
        WF.pickedItem.removeBlockedBy(WF.flow.items[id]);
    }
    WF.drawCanvas();
    app.editItem();
    app.cancelAction();
}
app.askToStartNew = function() {
    app.cancelAction(false);
    document.getElementById("locConfirmStartNew").style.display = "";
}
app.confirmStartNew = function() {
    WF.pickedItem = null;
    WF.flow = {
        title: "Workflow",
        items: {}
    }
    app.cancelAction();
    document.getElementById("wf_title").value = WF.flow.title;
    WF.drawCanvas();
    app.toggleMode("design");
    app.askToAddNewItem();
}
app.askToDeleteItem = function() {
    app.cancelAction(false);
    app.pendingAction = {action:"deleteItem"};
    document.getElementById("locConfirmDelete").style.display = "";
}
app.confirmDeleteItem = function() {
    WF.pushTransaction();
    var itm = WF.pickedItem;
    for (var id in WF.flow.items) {
        var other = WF.flow.items[id];
        other.removeBlockedBy(itm);
        other.removeBlock(itm);
    }
    delete WF.flow.items[itm.id];
    WF.pickedItem = null;
    WF.popTransaction();
    app.editItem();
    app.cancelAction();
    //if (Object.keys(WF.flow.items).length == 0) {
    //    app.askToLoadFlow();
    //}
}
app.cancelAction = function(showInstructions) {
    var forceInstructions = (showInstructions != undefined);
    if (showInstructions == undefined) showInstructions = false;
    app.pendingAction = null;
    document.getElementById("locConfirmDelete").style.display = "none";
    document.getElementById("locConfirmRemoveLink").style.display = "none";
    document.getElementById("locConfirmAddLink").style.display = "none";
    document.getElementById("locConfirmAddItem").style.display = "none";
    document.getElementById("locConfirmAddItem").style.display = "none";
    document.getElementById("locEditDoneCode").style.display = "none";
    document.getElementById("locEditLink").style.display = "none";  
    document.getElementById("locLoadLocal").style.display = "none";  
    document.getElementById("locSaveLocal").style.display = "none"; 
    document.getElementById("locConfirmStartNew").style.display = "none"; 
    document.getElementById("locInstructionsWorking").style.display = "none";
    document.getElementById("locInstructionsDesign").style.display = "none";
    var show = false;
    if (forceInstructions && showInstructions) {
        show = true;
    } else if (!forceInstructions && WF.pickedItem == null) {
        show = true;
    }
    if (show) {
        if (app.mode == "work") {
            document.getElementById("locInstructionsWorking").style.display = "";
        } else {
            document.getElementById("locInstructionsDesign").style.display = "";                    
        }
    }
}
app.updateWFTitle = function(el) {
    WF.flow.title = el.value;
    WF.drawCanvas();
}
app.updateItemTitle = function(el) {
    WF.pickedItem.title = el.value;
    WF.drawCanvas();
}
app.updateItemShape = function(el) {
    WF.pickedItem.shape = el.value;
    WF.drawCanvas();
}
app.updateBlockType = function(el) {
    WF.pickedItem.unblockIfAnyCompleted = (el.value == "any");
    app.editItem();
    WF.drawCanvas();
}
app.updateItemComplete = function(el) {
    var val = el.value;
    if (!app.isCollectionEmpty(WF.pickedItem.doneCodes)) {
        if (val == '') {
            WF.pickedItem.doneCode = null;
            WF.pickedItem.completed = false;
        } else {
            WF.pickedItem.doneCode = val;
            WF.pickedItem.completed = true;
        }
    } else {
        WF.pickedItem.completed = (val != '');
    }
    app.setFutureItemsIncomplete();
    app.editItem();
    WF.drawCanvas();
}
app.askToSaveFlow = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    document.getElementById("locSaveLocal").style.display = "";
    document.getElementById("locSaveToClipboard").value = JSON.stringify(WF.flow);
}
app.askToLoadFlow = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    document.getElementById("locLoadLocal").style.display = "";
}
app.saveLocal = function(spot) {
    var tag = "WF2_FLOW_" + spot;
    if (spot == undefined) {
        tag = "WF2_FLOW_WORKING";
    }
    localStorage.setItem(tag, JSON.stringify(WF.flow));
    if (spot != undefined) app.toast("Saved flow to local spot " + (spot + 1));
    app.cancelAction();
}
app.loadFromTextbox = function() {
    app.saveLocal();
    var json = document.getElementById("locLoadFromClipboard").value.trim();
    if (json == "") json = "This should not load";
    WF.flow = {
        title: "Workflow Sample",
        items: {}
    }
    WF.pickedItem = null
    try {
        var tmpFlow = JSON.parse(json);
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = new WFItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            WF.flow.items[id] = itm;
            itm.id = id;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
        app.toast("Loaded!");
        app.cancelAction(true);
    } catch {
        app.loadLocal(); // Restore what was there
        app.toast("Error loading contents of text area", true);
        WF.popTransaction(); // Probably failed after push transaction
    }
    document.getElementById("wf_title").value = WF.flow.title;
    //app.editItem();
}
app.loadLocal = function(spot) {
    var tag = "WF2_FLOW_" + spot;
    if (spot == undefined) {
        tag = "WF2_FLOW_WORKING";
    }
    var json = localStorage.getItem(tag);
    WF.flow = {
        title: "Workflow",
        items: {}
    }
    WF.pickedItem = null;
    try {
        var tmpFlow = JSON.parse(json);
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = new WFItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            WF.flow.items[id] = itm;
            itm.id = id;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
    } catch {
        WF.popTransaction(); // Probably failed after push transaction
        WF.pushTransaction();
        var itm1 = WF.addItem(260, 200, "pill", "Start");
        var itm2 = WF.addItem(400, 200, "box", "Do Something");
        itm2.addBlockedBy(itm1);
        var itm3 = WF.addItem(540, 200, "pill", "End");
        itm3.addBlockedBy(itm2);

        WF.popTransaction();
    }
    document.getElementById("wf_title").value = WF.flow.title;
    if (spot != undefined) app.toast("Loaded flow from local spot " + (spot + 1));
    app.cancelAction(true);

    if (app.isCollectionEmpty(WF.flow.items)) {
        if (app.mode == "work") {
            app.askToLoadFlow();
        }
    }
    //app.editItem();
}
app.setFutureItemsIncomplete = function(itm) {
    var calledWithItem = (!itm == undefined);
    if (itm == undefined) itm = WF.pickedItem;
    for (var key in itm.blocks) {
        var bby = WF.flow.items[key];
        if (bby.completed) {
            var okToCancel = true;
            if (bby.unblockIfAnyCompleted) {
                for (var key2 in bby.blockedBy) {
                    var backone = WF.flow.items[key2];
                    if (backone.id != itm.id) {
                        if (backone.completed) {
                            okToCancel = false;
                            break;
                        }
                    }
                }
            }
            if (okToCancel) {
                bby.doneCode = null;
                bby.completed = false;
                app.setFutureItemsIncomplete(bby);
            }
        } else {
            if (!app.isCollectionEmpty(bby.blocks)) isLastItem = false;
        }
    }
    if (!calledWithItem && WF.pickedItem.completed) {
        // If the only item left does not have any blocks
        // then it can just be completed
        if (app.isCollectionEmpty(WF.pickedItem.doneCodes)) {
            // Simple complete true/false
            //if (app.collectionSize(WF.pickedItem.blocks) == 1) {
            for (var bid in WF.pickedItem.blocks) {
                //var bid = app.collectionItem(WF.pickedItem.blocks, 0);
                var blk = WF.flow.items[bid];
                if (app.isCollectionEmpty(blk.blocks)) {
                    blk.doneCode = null;
                    blk.completed = true;
                }
            }
        } else {
            // Multiple done codes
            var done = WF.pickedItem.doneCode;
            for (var id in WF.pickedItem.blocks) {
                var blk = WF.flow.items[id];
                var link = blk.blockedBy[WF.pickedItem.id];
                var acodes = link.allowCodes.split(",");
                if (acodes.indexOf(done) >= 0) {
                    if (app.isCollectionEmpty(blk.blocks)) {
                        blk.doneCode = null;
                        blk.completed = true;
                    }
                }
            }
        }
        
        WF.drawCanvas();
    }
}
app.collectionItem = function(col, pos) {
    return Object.keys(col)[pos];
}
app.collectionSize = function(col) {
    return Object.keys(col).length;
}
app.isCollectionEmpty = function(col) {
    return (app.collectionSize(col) == 0);
}
app.isOneOf = function(val,opts) {
    return opts.split(",").indexOf(val) >= 0;
}