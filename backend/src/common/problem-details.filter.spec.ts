import { ArgumentsHost, BadRequestException, Logger } from "@nestjs/common";
import { ProblemDetailsFilter } from "./problem-details.filter";

function run(exception: unknown) {
  const json = jest.fn();
  const response = {
    status: jest.fn().mockReturnThis(),
    type: jest.fn().mockReturnThis(),
    json,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ method: "POST", path: "/v1/x" }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  new ProblemDetailsFilter().catch(exception, host);
  return { response, body: json.mock.calls[0][0] };
}

describe("ProblemDetailsFilter", () => {
  it("lists field-level validation messages", () => {
    const { response, body } = run(
      new BadRequestException(["identifier must be a string"]),
    );
    expect(response.status).toHaveBeenCalledWith(400);
    expect(body.errors).toEqual(["identifier must be a string"]);
  });

  it("omits errors for plain HTTP exceptions", () => {
    expect(run(new BadRequestException("nope")).body).not.toHaveProperty(
      "errors",
    );
  });

  it("hides internals of unexpected errors", () => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { response, body } = run(new Error("secret db detail"));
    expect(response.status).toHaveBeenCalledWith(500);
    expect(body.detail).toBe("An unexpected error occurred");
  });
});
