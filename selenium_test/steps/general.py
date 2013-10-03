from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
import selenium.webdriver.support.expected_conditions as EC
from nose.tools import assert_true  # pylint: disable=E0611

import wedutil

# Don't complain about redefined functions
# pylint: disable=E0102

WED_SERVER = "http://localhost:8888/web/kitchen-sink.html?mode=test"


def no_before_unload(context):
    context.driver.execute_script("window.onbeforeunload = undefined;")


def load_and_wait_for_editor(context, text=None):
    no_before_unload(context)
    driver = context.driver
    if text is not None:
        server = WED_SERVER + "&file=" + text
    else:
        server = WED_SERVER

    driver.get(server)

    def condition(*_):
        return driver.execute_script(
            "return window.wed_editor && " +
            "wed_editor.getCondition('initialized');")

    WebDriverWait(driver, 15).until(condition)


@when("the user loads the page")
def user_load(context):
    load_and_wait_for_editor(context)


@then("the editor shows a document")
def doc_appears(context):
    driver = context.driver
    WebDriverWait(driver, 2).until(
        EC.presence_of_element_located((By.CLASS_NAME, "_placeholder")))


@given("an open document")
def open_doc(context):
    load_and_wait_for_editor(context)


@given("a document containing a top level element, a p element, and text.")
def open_simple_doc(context):
    load_and_wait_for_editor(
        context,
        text="/build/test-files/wed_test_data/source_converted.xml")


@when('the user clicks on text that does not contain "{text}"')
def step_impl(context, text):
    driver = context.driver
    util = context.util

    element = util.find_clickable_element((By.CLASS_NAME, "title"))
    element.click()
    wedutil.wait_for_caret_to_be_in(util, element)
    context.element_to_test_for_text = element
    assert_true(
        util.get_text_excluding_children(element).find(text) == -1)


@when('the user clicks on the start label of an element that does not '
      'contain "{text}"')
def step_impl(context, text):
    driver = context.driver
    util = context.util

    button = util.find_element((By.CSS_SELECTOR,
                                "._start_button._title_label"))
    button.click()
    parent = button.find_element_by_xpath("..")
    assert_true(util.get_text_excluding_children(parent).find(text) == -1)
    context.element_to_test_for_text = parent


@when('the user resizes the window so that the editor pane has a vertical '
      'scrollbar')
def step_impl(context):
    driver = context.driver
    driver.set_window_size(683, 741)


@when('the user scrolls the editor pane down')
def step_impl(context):
    driver = context.driver
    util = context.util

    # We must not call it before the body is fully loaded.
    driver.execute_script("""
    jQuery(function () {
      delete window.__selenic_scrolled;
      window.scrollTo(0, document.body.scrollHeight);
      window.__selenic_scrolled = true;
    });
    """)

    def cond(*_):
        return driver.execute_script("""
        return window.__selenic_scrolled
        """)
    util.wait(cond)
