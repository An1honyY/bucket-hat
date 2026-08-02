import {
  confirmationProblem,
  emailProblem,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  passwordProblem,
} from "./credentials";

// docs/11-testing-strategy.md §11.1 — pure functions, tested alongside the
// screens that use them. The point of these is that all three auth forms
// reject the same inputs, so the cases here are the ones a user actually
// hits: a trailing space from autofill, a typo'd domain, a password one
// character short.

describe("isValidEmail", () => {
  it.each(["you@example.com", "first.last+tag@sub.example.co.nz", " padded@example.com "])("accepts %s", (value) => {
    expect(isValidEmail(value)).toBe(true);
  });

  it.each(["", "you", "you@", "@example.com", "you@example", "two words@example.com"])("rejects %s", (value) => {
    expect(isValidEmail(value)).toBe(false);
  });
});

describe("emailProblem", () => {
  it("asks for an address when the field is empty", () => {
    expect(emailProblem("   ")).toBe("Enter your email address.");
  });

  it("names the shape problem rather than repeating 'required'", () => {
    expect(emailProblem("you@example")).toBe("That doesn't look like an email address.");
  });

  it("passes a valid address", () => {
    expect(emailProblem("you@example.com")).toBeUndefined();
  });
});

describe("passwordProblem", () => {
  it("asks for a password when empty", () => {
    expect(passwordProblem("")).toBe("Enter a password.");
  });

  it("rejects one character short of the minimum", () => {
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH - 1))).toBe(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  });

  it("accepts exactly the minimum", () => {
    expect(passwordProblem("a".repeat(MIN_PASSWORD_LENGTH))).toBeUndefined();
  });

  it("never trims — spaces are legitimate password characters", () => {
    expect(passwordProblem("        ")).toBeUndefined();
  });
});

describe("confirmationProblem", () => {
  it("asks for the second entry before comparing", () => {
    expect(confirmationProblem("hunter2hunter2", "")).toBe("Type the password again.");
  });

  it("catches a mismatch", () => {
    expect(confirmationProblem("hunter2hunter2", "hunter2hunter3")).toBe("Those passwords don't match.");
  });

  it("passes a match", () => {
    expect(confirmationProblem("hunter2hunter2", "hunter2hunter2")).toBeUndefined();
  });
});
