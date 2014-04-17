from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import MoveTargetOutOfBoundsException

step_matcher("re")


@when(ur"^the user introduces an error in the document$")
def step_impl(context):
    driver = context.driver
    util = context.util

    title = util.find_element((By.CSS_SELECTOR,
                               ".__start_label._title_label"))
    context.clicked_element = title

    ActionChains(driver)\
        .click(title)\
        .perform()

    context.execute_steps(u"""
    When the user types DELETE
    """)


@then(ur"^additional errors appear in the error panel$")
def step_impl(context):
    driver = context.driver
    util = context.util

    def cond(*_):
        return driver.execute_script("""
        return jQuery("#sb-errorlist").children().length !== 0;
        """)

    util.wait(cond)


@when(ur"^the user clicks the last error in the error panel$")
def step_impl(context):
    driver = context.driver
    util = context.util

    el = driver.execute_script("""
        var $ = jQuery;
        var $collapse = $("#sb-errors-collapse");
        if (!$collapse.is(".in"))
            $collapse.collapse('show');
        var $errors = $("#sb-errorlist");
        var $last = $errors.children().last();
        $last[0].scrollIntoView();
        return $last[0];
        """)

    util.wait(lambda *_: el.is_displayed())

    def cond(*_):
        ret = False
        try:
            el.click()
            ret = True
        except MoveTargetOutOfBoundsException:
            pass
        return ret

    util.wait(cond)


@then(ur"^the last error marker is fully visible\.?$")
def step_impl(context):
    driver = context.driver
    util = context.util

    def cond(*_):
        top = driver.execute_script("""
        var $ = jQuery;
        var top = $(".wed-validation-error").last().position().top;
        return top;
        """)

        # Sigh... Firefox will come close but not quite, so...
        return abs(top) < 2

    util.wait(cond)