import { render, fireEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Button } from "@/components/ui/button-custom";

// expo-haptics is not installed — mock handled via moduleNameMapper in package.json

describe("Button Custom", () => {
  it("should_RenderWithLabel_When_LabelProvided", () => {
    // Arrange
    const { getByText } = render(
      <Button label="Click me" onPress={() => {}} />
    );

    // Act & Assert
    expect(getByText("Click me")).toBeTruthy();
  });

  it("should_CallOnPress_When_Pressed", () => {
    // Arrange
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button label="Click me" onPress={onPress} />
    );

    // Act
    fireEvent.press(getByRole("button"));

    // Assert
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("should_NotCallOnPress_When_Disabled", () => {
    // Arrange
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button label="Click me" onPress={onPress} disabled />
    );

    // Act
    fireEvent.press(getByRole("button"));

    // Assert
    expect(onPress).not.toHaveBeenCalled();
  });

  it("should_HaveMinimumTouchTarget_When_Rendered", () => {
    // Arrange
    const { getByRole } = render(
      <Button label="Click me" onPress={() => {}} />
    );

    // Act
    const button = getByRole("button");
    const flatStyle = StyleSheet.flatten(button.props.style);

    // Assert (WCAG AA — touch target >= 44px)
    expect(flatStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(flatStyle.minWidth).toBeGreaterThanOrEqual(44);
  });

  it("should_HaveAccessibilityLabel_When_Rendered", () => {
    // Arrange
    const { getByLabelText } = render(
      <Button label="Click me" onPress={() => {}} />
    );

    // Act & Assert
    expect(getByLabelText("Click me")).toBeTruthy();
  });

  it("should_ShowLoadingIndicator_When_LoadingIsTrue", () => {
    // Arrange
    const { getByTestId, queryByText } = render(
      <Button label="Click me" onPress={() => {}} loading />
    );

    // Act & Assert
    expect(getByTestId("button-loading-indicator")).toBeTruthy();
    expect(queryByText("Click me")).toBeNull();
  });

  it("should_ApplyCorrectStyles_When_VariantIsPrimary", () => {
    // Arrange
    const { getByRole } = render(
      <Button label="Click me" onPress={() => {}} variant="primary" />
    );

    // Act
    const button = getByRole("button");

    // Assert
    expect(button.props.className).toContain("bg-orange");
  });

  it("should_ApplyCorrectStyles_When_VariantIsSecondary", () => {
    // Arrange
    const { getByRole } = render(
      <Button label="Click me" onPress={() => {}} variant="secondary" />
    );

    // Act
    const button = getByRole("button");

    // Assert
    expect(button.props.className).toContain("bg-brown-light");
  });
});
