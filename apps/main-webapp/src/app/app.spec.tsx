import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

jest.mock("./shared/lib/supabase");

const mockState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  setSession: jest.fn(),
  setUser: jest.fn(),
  logout: jest.fn(),
  initialize: jest.fn(),
};

jest.mock("@shared/stores/authStore", () => ({
  useAuthStore: jest.fn().mockImplementation((selector?: (state: typeof mockState) => unknown) => {
    if (typeof selector === "function") {
      return selector(mockState);
    }
    return mockState;
  }),
}));

import App from "./app";

describe("App", () => {
  it("should render successfully", () => {
    const { baseElement } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    expect(baseElement).toBeTruthy();
  });

  it("should render login page by default", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    expect(
      screen.getByText("Enter your phone number to receive a login code"),
    ).toBeTruthy();
  });
});
