from selenium.webdriver.common.action_chains import ActionChains
from nose.tools import assert_true, assert_equal  # pylint: disable=E0611
from selenium.webdriver.support.ui import WebDriverWait
import selenium.webdriver.support.expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

import wedutil

# Don't complain about redefined functions
# pylint: disable=E0102


@when(u"the user clicks on an element's label")
def step_impl(context):
    driver = context.driver
    util = context.util

    button = util.find_element((By.CSS_SELECTOR, "._end_button._p_label"))
    context.clicked_element = button
    assert_true("_button_clicked" not in button.get_attribute("class").split())
    ActionChains(driver)\
        .click(button)\
        .perform()


@when(u"the user hits the right arrow")
def step_impl(context):
    driver = context.driver
    ActionChains(driver)\
        .send_keys(Keys.ARROW_RIGHT)\
        .perform()


@then(u'the label changes to show it is selected')
def step_impl(context):
    button = context.clicked_element
    assert_true("_button_clicked" in button.get_attribute("class").split())


@then(u'the caret disappears')
def step_impl(context):
    driver = context.driver
    WebDriverWait(driver, 2).until_not(EC.presence_of_element_located(
        (By.CLASS_NAME, "_wed_caret")))

step_matcher("re")


@when(u'the user selects text(?P<direction>.*?) with the mouse')
def step_impl(context, direction):
    driver = context.driver
    util = context.util

    direction = direction.strip()

    element = util.find_element((By.CSS_SELECTOR,
                                 "._start_button._title_label"))
    parent = element.find_element_by_xpath("..")
    element.click()
    wedutil.wait_for_caret_to_be_in(util, parent)

    # From the label to before the first letter and then past the
    # first letter.
    ActionChains(driver)\
        .send_keys(*[Keys.ARROW_RIGHT] * 3)\
        .perform()

    # We need to get the location of the caret.
    start = wedutil.caret_selection_pos(driver)
    # This moves two caracters to the right
    ActionChains(driver)\
        .send_keys(*[Keys.ARROW_RIGHT] * 2)\
        .perform()
    end = wedutil.caret_selection_pos(driver)

    if direction == "":
        wedutil.select_text(driver, start, end)
    elif direction == "backwards":
        wedutil.select_text(driver, end, start)
    else:
        raise ValueError("unexpected direction: " + direction)

    text = util.get_text_excluding_children(parent)
    context.expected_selection = text[1:3]


@when(u'the user selects text(?P<direction>.*?) with the keyboard')
def step_impl(context, direction):
    direction = direction.strip()
    driver = context.driver
    util = context.util

    element = util.find_element((By.CSS_SELECTOR,
                                 "._start_button._title_label"))

    if direction == "":
        # From the label to before the first letter and then past the
        # first letter.
        ActionChains(driver)\
            .click(element)\
            .send_keys(*[Keys.ARROW_RIGHT] * 3)\
            .perform()

         # This moves two caracters to the right with shift down.
        ActionChains(driver)\
            .key_down(Keys.SHIFT)\
            .send_keys(*[Keys.ARROW_RIGHT] * 2)\
            .key_up(Keys.SHIFT)\
            .perform()
    elif direction == "backwards":
        # From the label to before the first letter and then past the
        # first letter, and then two more to the right.
        ActionChains(driver)\
            .click(element)\
            .send_keys(*[Keys.ARROW_RIGHT] * (3 + 2))\
            .perform()

         # This moves two caracters to the left with shift down.
        ActionChains(driver)\
            .key_down(Keys.SHIFT)\
            .send_keys(*[Keys.ARROW_LEFT] * 2)\
            .key_up(Keys.SHIFT)\
            .perform()
    else:
        raise ValueError("unexpected direction: " + direction)

    parent = element.find_element_by_xpath("..")
    text = util.get_text_excluding_children(parent)
    context.expected_selection = text[1:3]


step_matcher("parse")


@then(u'the text is selected')
def step_impl(context):
    driver = context.driver
    util = context.util

    assert_equal(util.get_selection_text(), context.expected_selection)
