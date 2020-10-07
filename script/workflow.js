var WF = {
    flow: {
        title: "Workflow Sample",
        items: {}
    },
    canvas: null,
    ctx: null,
    pickedItem: null,
    pickHitBox: 80,
    gridsize: 20,
    transactionLevel: 0,
    inTransaction: false,
    eventTarget: null
}
WF.pushTransaction = function() {
    WF.transactionLevel++;
    WF.inTransaction = true;
}
WF.popTransaction = function() {
    if (WF.transactionLevel > 0) WF.transactionLevel--;
    WF.inTransaction = WF.transactionLevel > 0;
    if (!WF.inTransaction) WF.drawCanvas();
}
var WFItem = function(x, y, shape, title) {
    var tmpid = 0;
    while(WF.flow.items[tmpid] != null) tmpid++;
    this.id = tmpid;
    this.x = x;
    this.y = y;
    this.shape = shape;
    this.title = title;
    // If doneCodes is empty then the only value kept 
    // for completed is this value. However, if doneCodes
    // has at least one value, completed is true for any of
    // those values being set... and if none are set... completed
    // is false
    this.completed = false;
    // doneCode cause the completion to be a selection
    // of a list of items. If there is only one item in doneCodes
    // then the only option is Not completed, or the value in 
    // the doneCodes collection.
    this.doneCodes = {};
    // ex: {
    //    AAA: {code:AAA, value:'First Option'},
    //    BBB: {code:BBB, value:'Second Option'},
    //    CCC: {code:CCC, value:'Third Option'}
    // }

    // If doneCodes has values and one of them are picked,
    // then doneCode is set to that value.
    this.doneCode = null;
    // ex: 'AAA'

    // true means that if there are multiple blocks, this item
    // is considered unblocked if even 1 of them are completed.
    // false means that they must ALL be completed
    this.unblockIfAnyCompleted = false;

    // Items this item is directly blocked by.
    // Each item in the array will be an ID assigned to
    // another item and an optional list of done codes
    // that indicate an acceptable "done" condition.
    this.blockedBy = {};
    // ex: {} -> No blocked by links
    // ex: {{id:2,codes:null}} -> Blocked by item id 2 with any done code
    // ex: {{id:2,codes:'AAA,BBB'}}
    // Note: The codes refer to "done codes" from the item with the id
    // referenced in the item blockedBy array item itself.

    // A reciprocal list from the blockedBy list. 
    // If an item with id 4 has a blockedBy list that has {id:2, codes:null}
    // then blocks on item with id 2 will contain the value
    // [4] (it may contain other ids as well)
    // Note: The blocks list does not contain any done codes
    this.blocks = {};
}
WFItem.prototype.canChangeComplete = function() {
    var anyCompleted = false;
    rslt = true;
    for (var otherid in this.blocks) {
        var other = WF.flow.items[otherid];
        if (other.completed) {
            rslt = false;
            break;
        }
    }
    return rslt;
}
WFItem.prototype.isBlocked = function() {
    var blocked = false;
    var anyDone = false;
    var allDone = true; // Turned off as found
    for (var bbnum in this.blockedBy) {
        var link = this.blockedBy[bbnum];
        var other = WF.flow.items[bbnum];
        if (other.completed) {
            if (link.allowCodes == null) {
                anyDone = true;
            } else {
                if (app.isOneOf(other.doneCode, link.allowCodes)) {
                    anyDone = true;
                } else {
                    allDone = false;
                }
            }
        } else {
            allDone = false;
        }
    }
    if (this.unblockIfAnyCompleted) {
        blocked = !anyDone;
    } else {
        blocked = !allDone;
    }
    return blocked;
}
WFItem.prototype.addBlock = function(itm, allowCodes) {
    return itm.addBlockedBy(this, allowCodes);
}
WFItem.prototype.removeBlock = function(itm) {
    itm.removeBlockedBy(this);
}
WFItem.prototype.addBlockedBy = function(itm, allowCodes) {
    if (this.blockedBy[itm.id] == null && this.blocks[itm.id] == null) {
        if (allowCodes == undefined) allowCodes = null;
        this.blockedBy[itm.id] = {id:itm.id, allowCodes:allowCodes}
        itm.blocks[this.id] = {id:this.id}
        return true;
    } else {
        return false;
    }
}
WFItem.prototype.removeBlockedBy = function(itm) {
    delete this.blockedBy[itm.id];
    delete itm.blocks[this.id];
}
WF.addItem = function(x, y, shape, title) {
    var itm = new WFItem(x, y, shape, title);
    WF.flow.items[itm.id] = itm;
    if (!WF.inTransaction) WF.drawCanvas();
    return itm;
}
WF.drawCanvas = function() {
    app.saveLocal(); // Working 
    WFUI.drawCanvas(WF.flow.items);
}
function initWF() {
    var frm = document.getElementById("frmWF");
    frm.elements.namedItem("wf_title").value = WF.flow.title; 

    WFUI.canvas = document.createElement("canvas");
    var can = WFUI.canvas;
    can.height = 1200;
    can.width = 800;
    document.getElementById("canvasContainer").appendChild(can);
    // Get the device pixel ratio, falling back to 1.
    var dpr = window.devicePixelRatio || 1;
    // Get the size of the canvas in CSS pixels.
    var rect = can.getBoundingClientRect();
    // Give the canvas pixel dimensions of their CSS
    // size * the device pixel ratio.
    can.width = rect.width * dpr;
    can.height = rect.height * dpr;
    WFUI.ctx = can.getContext('2d');
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    WFUI.ctx.scale(dpr, dpr);

    WF.eventTarget = document.createTextNode(null); // Dummy target for events
    // Pass EventTarget interface calls to DOM EventTarget object
    WF.addEventListener = WF.eventTarget.addEventListener.bind(WF.eventTarget);
    WF.removeEventListener = WF.eventTarget.removeEventListener.bind(WF.eventTarget);
    WF.dispatchEvent = function(ename, detail) {
        //console.log("Event: " + ename + ", Detail: " + JSON.stringify(detail));
        WF.eventTarget.dispatchEvent(new CustomEvent(ename, {detail:detail}));
    }

    WF.addEventListener("itempicked", function(e) {
        if (e.detail.item == null) {
            //app.toast("Clicked open area");
            app.hideEditor();
            app.pendingAction = null;
        } else {
            //app.toast("Clicked: " + e.detail.item.title);
            app.editItem();
        }
    });
    WF.addEventListener("linkadded", function(e) {
        //WorkflowUI.drawConnector(e.detail.blockedByStep, e.detail.blockedStep);
    });
    WF.addEventListener("linkremoved", function(e) {
        //WorkflowUI.drawCanvas(this);
    });


    can.addEventListener("mousedown", function(event) {
        var can = WFUI.canvas;
        // Inidicate where the drag started.
        // NOTE: Dragging does not commence until movement is made
        WFUI.dragstart = {
            item:null //, 
        };

        var x = event.offsetX;
        var y = event.offsetY;

        var itm = WFUI.getItemUnderXY(x, y);
        if (app.pendingAction != null) {
            if (app.pendingAction.action == "addLink") {
                app.confirmAddLink(itm);
                return;
            } else if (app.pendingAction.action == "addItem") {
                if (itm == null) {
                        var newx = parseInt((x + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
                        var newy = parseInt((y + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
                        app.confirmAddNewItem(newx, newy);
                    return;
                } else {
                    app.toast("Add item action cancelled because you clicked on an item");
                    app.cancelAction();
                }
            }
        }

        var prev = WF.pickedItem;
        WF.pickedItem = itm;
        WF.drawCanvas();
        WF.dispatchEvent("itempicked", {item:itm, prev:prev});
/*
        if (WorkflowUI.pickedSpot != null) {
            WorkflowUI.clearPickedSpot();
        }
        WorkflowUI.pickedSpot = WorkflowUI.rowColForXY(x, y);
        var step = WorkflowUI.stepUnderXY(page.wflow, x, y);
        if (step != null) {
            WorkflowUI.pickedSpot = null;
            if (WorkflowUI.pickAction == null) {
                page.wflow.flow.pickedStep = step;
                WorkflowUI.highlightStep(can, step, true);
                WorkflowUI.masterFlow.dispatchEvent("steppicked", {step:step});
            } else {
                var act = WorkflowUI.pickAction;
                WorkflowUI.masterFlow.dispatchEvent("actioncompleted", {source:page.wflow.flow.pickedStep, step:step, action:act});
                //WorkflowUI.pickAction = null;
            }
        } else {
            //WorkflowUI.pickAction = null; // Reset any pending actions
            if (WorkflowUI.pickAction != null) {
                var act = WorkflowUI.pickAction;
                WorkflowUI.pickAction = null;
                WorkflowUI.masterFlow.dispatchEvent("actionaborted", {action:act});
            }
            page.wflow.flow.pickedStep = null;
            if (event.button == 0) {
                WorkflowUI.pickAction = null;
                WorkflowUI.markPickedSpot();
                WorkflowUI.masterFlow.dispatchEvent("emptyspotpicked", {spot:WorkflowUI.pickedSpot});
            } else {
                WorkflowUI.pickAction = null;
                WorkflowUI.masterFlow.dispatchEvent("clear", {});
            }
        }
*/
        
    });
    can.addEventListener("mouseup", function(event) {
        var can = WFUI.canvas;
        if (WFUI.dragstart != null) {
            if (WFUI.dragstart.item != null) {
                var newx = parseInt((WF.pickedItem.x + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
                var newy = parseInt((WF.pickedItem.y + (WF.gridsize/2)) / WF.gridsize) * WF.gridsize;
                WF.pickedItem.x = newx;
                WF.pickedItem.y = newy;
                WFUI.dragstart.item = null;
                WF.drawCanvas();
                //app.toast("Dropped " + WF.pickedItem.title);
            }
            WFUI.dragstart = null;
        }
    });
    can.addEventListener("mouseout", function(event) {
        var can = WFUI.canvas;
        WFUI.dragstart = null;
        can.style.cursor = "default";
    });
    can.addEventListener("mousemove", function(event) {
        var can = WFUI.canvas;
        if (WF.pickedItem == null) return; // Nothing picked... nothing to drag
        if (WFUI.dragstart == null) return; // Still nothing to drag
        if (WFUI.dragstart.item == null) {
            // Just started dragging
            WFUI.dragstart.item = WF.pickedItem;
        }
        WF.pickedItem.x = event.offsetX;
        WF.pickedItem.y = event.offsetY;
        WF.drawCanvas();
        //app.toast("Dragging " + WF.pickedItem.title);
/*
        var moved = false;
        if (moveX > (WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter)) {
            var pre = page.wflow.flow.pickedStep.location.col;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "H", 1);
            if (page.wflow.flow.pickedStep.location.col != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " right");
                WorkflowUI.dragstart.x = event.clientX;
                moved = true;
            }
        }
        if (moveX < ((WorkflowUI.stepImageWidth + WorkflowUI.stepImageColumnGutter) * -1)) {
            var pre = page.wflow.flow.pickedStep.location.col;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "H", -1);
            if (page.wflow.flow.pickedStep.location.col != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " left");
                WorkflowUI.dragstart.x = event.clientX;
                moved = true;
            }
        }
        if (moveY > WorkflowUI.stepImageWidth + 20) {
            var pre = page.wflow.flow.pickedStep.location.row;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "V", 1);
            if (page.wflow.flow.pickedStep.location.row != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " down");
                WorkflowUI.dragstart.y = event.clientY;
                moved = true;
            }
        }
        if (moveY < ((WorkflowUI.stepImageWidth + 20) * -1)) {
            var pre = page.wflow.flow.pickedStep.location.row;
            WorkflowUI.masterFlow.move(page.wflow.flow.pickedStep, "V", -1);
            if (page.wflow.flow.pickedStep.location.row != pre) {
                //debug("Moving step " + page.wflow.flow.pickedStep.title + " down");
                WorkflowUI.dragstart.y = event.clientY;
                moved = true;
            }
        }
        if (moved) {
            WorkflowUI.drawCanvas();
            WorkflowUI.highlightStep(WorkflowUI.canvas, page.wflow.flow.pickedStep, true);
        }
*/
    });

    
}