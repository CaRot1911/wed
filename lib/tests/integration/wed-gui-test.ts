/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
import * as mergeOptions from "merge-options";

import * as wed from "wed/wed";

import * as globalConfig from "../base-config";
import { EditorSetup } from "../wed-test-util";

const options = {
  schema: "/base/build/schemas/tei-simplified-rng.js",
  mode: {
    path: "wed/modes/test/test-mode",
    options: {
      metadata: "/base/build/schemas/tei-metadata.json",
    },
  },
};

const assert = chai.assert;

describe("wed gui:", () => {
  let setup: EditorSetup;
  let editor: wed.Editor;

  before(() => {
    setup = new EditorSetup(
      "/base/build/standalone/lib/tests/wed_test_data/source_converted.xml",
      mergeOptions(globalConfig.config, options),
      document);
    ({ editor } = setup);
    return setup.init();
  });

  afterEach(() => {
    setup.reset();
  });

  after(() => {
    setup.restore();
    // tslint:disable-next-line:no-any
    (editor as any) = undefined;
  });

  describe("setNavigationList", () => {
    let $navigationPanel: JQuery;

    before(() => {
      // tslint:disable-next-line:no-any
      $navigationPanel = (editor as any).$navigationPanel;
    });

    it("makes the navigation list appear", () => {
      assert.equal($navigationPanel.css("display"), "none",
                   "the list is not displayed");
      editor.setNavigationList([]);
      assert.equal($navigationPanel.css("display"), "block",
                   "the list is displayed");
    });
  });
});
