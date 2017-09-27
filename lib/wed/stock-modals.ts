/**
 * A collection of stock modals for an editor instance.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */

import * as buildInfo from "./build-info";
import { Modal } from "./gui/modal";

export interface ModalMaker {
  makeModal(): Modal;
  docLink: string;
}

export type ModalNames = "limitation" | "paste" | "straddling" | "help" |
  "disconnect" | "editedByOther" | "tooOld";

/**
 * A collection of stock modals.
 */
export class StockModals {
  private readonly modals: Map<string, Modal> = new Map();

  constructor(private readonly maker: ModalMaker) {}

  getModal(name: ModalNames): Modal {
    let modal = this.modals.get(name);
    if (modal === undefined) {
      modal = this.make(name);
      this.modals.set(name, modal);
    }

    return modal;
  }

  private make(name: ModalNames): Modal {
    const modal = this.maker.makeModal();
    switch (name) {
    case "limitation":
      modal.setTitle("Cannot proceed");
      break;
    case "paste":
      modal.setTitle("Invalid structure");
      modal.setBody("<p>The data you are trying to paste appears to be \
XML. However, pasting it here will result in a structurally invalid document. \
Do you want to paste it as text instead? (If you answer negatively, the data \
won't be pasted at all.)<p>");
      modal.addYesNo();
      break;
    case "straddling":
      modal.setTitle("Invalid modification");
      modal.setBody("<p>The text selected straddles disparate \
elements of the document. You may be able to achieve what you want to do by \
selecting smaller sections.<p>");
      modal.addButton("Ok", true);
      break;
    case "help":
      const docLink = this.maker.docLink;
      modal.setTitle("Help");
      modal.setBody(`
<p>Click <a href='${docLink}' target='_blank'>this link</a> to see
wed's generic help. The link by default will open in a new tab.</p>
<p>The key combinations with Ctrl below are done with Command in OS X.</p>
<ul>
  <li>Clicking the right mouse button on the document contents brings up a
contextual menu.</li>
  <li>F1: help</li>
  <li>Ctrl-[: Decrease the label visibility level.</li>
  <li>Ctrl-]: Increase the label visibility level.</li>
  <li>Ctrl-S: Save</li>
  <li>Ctrl-X: Cut</li>
  <li>Ctrl-V: Paste</li>
  <li>Ctrl-C: Copy</li>
  <li>Ctrl-Z: Undo</li>
  <li>Ctrl-Y: Redo</li>
  <li>Ctrl-/: Bring up a contextual menu.</li>
</ul>
<p class='wed-build-info'>Build descriptor: ${buildInfo.desc}<br/>
Build date: ${buildInfo.date}</p>`);
      modal.addButton("Close", true);
      break;
    case "disconnect":
      modal.setTitle("Disconnected from server!");
      modal.setBody(
        "It appears your browser is disconnected from the server. Editing is \
frozen until the connection is reestablished. Dismissing this dialog will \
retry saving. If the operation is successful, you'll be able to continue \
editing. If not, this message will reappear.");
      modal.addButton("Retry", true);
      break;
    case "editedByOther":
      modal.setTitle("Edited by another!");
      modal.setBody(
      "Your document was edited by someone else since you last loaded or \
saved it. You must reload it before trying to edit further.");
      modal.addButton("Reload", true);
      break;
    case "tooOld":
      modal.setTitle("Newer version!");
      modal.setBody(
      "There is a newer version of the editor. You must reload it before \
trying to edit further.");
      modal.addButton("Reload", true);
      break;
    default:
      // This will err at compilation time if we forget a case above.
      const badName: never = name;
      // If we do get here by mistake, we get a runtime error.
      throw new Error(`cannot handle name ${badName}`);
    }

    return modal;
  }
}

//  LocalWords:  MPL editedByOther tooOld href docLink wed's Ctrl ul li runtime
//  LocalWords:  badName