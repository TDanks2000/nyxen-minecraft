import { describe, expect, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../src/views/main/components/ui/toggle-group";
import {
  canCreateNewInstanceFromAction,
  getNewInstanceFormSubmitAction,
} from "../src/views/main/features/instances/new-instance-dialog-logic";

describe("new instance dialog step actions", () => {
  test("form submits from the version step can advance but cannot create", () => {
    expect(
      getNewInstanceFormSubmitAction({
        activeStepIndex: 1,
        lastStepIndex: 2,
        canContinue: true,
        hasSubmitter: false,
      }),
    ).toBe("continue");

    expect(
      canCreateNewInstanceFromAction({
        activeStepIndex: 1,
        lastStepIndex: 2,
        canSubmit: true,
      }),
    ).toBe(false);
  });

  test("creation is only allowed from the performance step", () => {
    expect(
      canCreateNewInstanceFromAction({
        activeStepIndex: 2,
        lastStepIndex: 2,
        canSubmit: true,
      }),
    ).toBe(true);

    expect(
      canCreateNewInstanceFromAction({
        activeStepIndex: 2,
        lastStepIndex: 2,
        canSubmit: false,
      }),
    ).toBe(false);
  });

  test("form submits on the performance step do not create implicitly", () => {
    expect(
      getNewInstanceFormSubmitAction({
        activeStepIndex: 2,
        lastStepIndex: 2,
        canContinue: true,
        hasSubmitter: false,
      }),
    ).toBe("ignore");
  });

  test("button-originated form submits are ignored on the version step", () => {
    expect(
      getNewInstanceFormSubmitAction({
        activeStepIndex: 1,
        lastStepIndex: 2,
        canContinue: true,
        hasSubmitter: true,
      }),
    ).toBe("ignore");
  });

  test("mod loader toggle items render as non-submit buttons", () => {
    const markup = renderToStaticMarkup(
      React.createElement(
        "form",
        null,
        React.createElement(
          ToggleGroup,
          { value: ["fabric"] },
          React.createElement(
            ToggleGroupItem,
            { type: "button", value: "fabric" },
            "Fabric",
          ),
        ),
      ),
    );

    expect(markup).toContain('<button type="button"');
  });
});
