import { prepareFunctionCall } from "../../services/functionInputSetup";
import * as assert from "assert";
import { FunctionParameter } from "../../services/functionParsing/documentTransformer";
import { pointerParam, scalarParam } from "./testHelpers";

/**
 * The file contains unit tests for the prepareFunctionCall function.
 * It tests the function's behavior with various parameter types and input values.
 */

suite("Unit: Prepared Function Call Test Suite", () => {

    test("handles scalar parameters correctly", () => {

        const parameters: FunctionParameter[] = [
            scalarParam("int", "a"),
            scalarParam("float", "b"),
            scalarParam("double", "c")
        ];

        const inputValues = ["42", "3.14", "2.71828"];
        const expectedCall = {
            setupCode: [],
            argumentsList: ["42", "3.14", "2.71828"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles non-null pointer parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            pointerParam("int*", "ptr", "int"),
        ];

        const inputValues = ["42"];
        const expectedCall = {
            setupCode: [
                "int ptr_SIK_storage = 42;",
                "int* ptr = &ptr_SIK_storage;",
            ],
            argumentsList: ["ptr"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles null pointer parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            pointerParam("int*", "ptr", "int"),
        ];

        const inputValues = ["NULL"];
        const expectedCall = {
            setupCode: [
                "int* ptr = NULL;",
            ],
            argumentsList: ["ptr"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles scalar followed by pointer parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            scalarParam("int", "a"),
            pointerParam("float*", "ptr", "float"),
        ];

        const inputValues = ["42", "3.14"];
        const expectedCall = {
            setupCode: [
                "float ptr_SIK_storage = 3.14;",
                "float* ptr = &ptr_SIK_storage;",
            ],
            argumentsList: ["42", "ptr"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles pointer followed by scalar parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            pointerParam("double*", "ptr", "double"),
            scalarParam("int", "a"),
        ];

        const inputValues = ["2.71828", "42"];
        const expectedCall = {
            setupCode: [
                "double ptr_SIK_storage = 2.71828;",
                "double* ptr = &ptr_SIK_storage;",
            ],
            argumentsList: ["ptr", "42"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles multiple pointer parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            pointerParam("int*", "ptr1", "int"),
            pointerParam("float*", "ptr2", "float"),
        ];

        const inputValues = ["42", "3.14"];
        const expectedCall = {
            setupCode: [
                "int ptr1_SIK_storage = 42;",
                "int* ptr1 = &ptr1_SIK_storage;",
                "float ptr2_SIK_storage = 3.14;",
                "float* ptr2 = &ptr2_SIK_storage;",
            ],
            argumentsList: ["ptr1", "ptr2"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("rejects invalid literals for scalar parameters", () => {
        const parameters: FunctionParameter[] = [
            scalarParam("int", "a"),
        ];

        const inputValues = ["not_a_number"];
        assert.throws(() => {
            prepareFunctionCall(parameters, inputValues);
        });
    });

    test("rejects invalid literals for pointer parameters", () => {
        const parameters: FunctionParameter[] = [
            pointerParam("int*", "ptr", "int"),
        ];

        const inputValues = ["not_a_number"];
        assert.throws(() => {
            prepareFunctionCall(parameters, inputValues);
        });
    });

    test("rejects input-count mismatch", () => {
        const parameters: FunctionParameter[] = [
            scalarParam("int", "a"),
            pointerParam("float*", "ptr", "float"),
        ];

        const inputValues = ["42"]; // Missing one input for the pointer parameter
        assert.throws(() => {
            prepareFunctionCall(parameters, inputValues);
        });
    });


});