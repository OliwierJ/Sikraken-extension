import { prepareFunctionCall } from "../../services/functionInputSetup";
import * as assert from "assert";
import { FunctionParameter } from "../../services/functionParsing/documentTransformer";
import { arrayParam, pointerParam, scalarParam } from "./testHelpers";
import { PreparedParameterInput } from "../../services/testInputParser";

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

        const inputValues = [{kind: "scalar", value: "42"}, {kind: "scalar", value: "3.14"}, {kind: "scalar", value: "2.71828"}];
        const expectedCall = {
            setupCode: [],
            argumentsList: ["42", "3.14", "2.71828"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues as PreparedParameterInput[]);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles non-null pointer parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            pointerParam("int*", "ptr", "int"),
        ];

        const inputValues: PreparedParameterInput[] = [{kind: "pointer", value: "42"}];
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

        const inputValues: PreparedParameterInput[] = [{kind: "pointer", value: "NULL"}];
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

        const inputValues: PreparedParameterInput[] = [{kind: "scalar", value: "42"}, {kind: "pointer", value: "3.14"}];
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

        const inputValues: PreparedParameterInput[] = [{kind: "pointer", value: "2.71828"}, {kind: "scalar", value: "42"}];
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

        const inputValues: PreparedParameterInput[] = [{kind: "pointer", value: "42"}, {kind: "pointer", value: "3.14"}];
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

        const inputValues: PreparedParameterInput[] = [{kind: "scalar", value: "not_a_number"}];
        assert.throws(() => {
            prepareFunctionCall(parameters, inputValues);
        });
    });

    test("rejects invalid literals for pointer parameters", () => {
        const parameters: FunctionParameter[] = [
            pointerParam("int*", "ptr", "int"),
        ];

        const inputValues: PreparedParameterInput[] = [{kind: "pointer", value: "not_a_number"}];
        assert.throws(() => {
            prepareFunctionCall(parameters, inputValues);
        });
    });

    test("rejects input-count mismatch", () => {
        const parameters: FunctionParameter[] = [
            scalarParam("int", "a"),
            pointerParam("float*", "ptr", "float"),
        ];

        const inputValues: PreparedParameterInput[] = [{kind: "scalar", value: "42"}]; // Missing one input for the pointer parameter
        assert.throws(() => {
            prepareFunctionCall(parameters, inputValues);
        });
    });

    test("handles nan sikraken output for float parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            scalarParam("float", "a"),
        ];

        const inputValues: PreparedParameterInput[] = [{kind: "scalar", value: "nan"}];
        const expectedCall = {
            setupCode: [],
            argumentsList: ["NAN"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles infinity sikraken output for double parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            scalarParam("double", "a"),
        ];

        const inputValues: PreparedParameterInput[] = [{kind: "scalar", value: "inf"}];
        const expectedCall = {
            setupCode: [],
            argumentsList: ["INFINITY"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles fixed-length array parameters correctly", () => {
        const parameters: FunctionParameter[] = [
            arrayParam("int[3]", "arr", "int", 3),
        ];

        const inputValues: PreparedParameterInput[] = [{kind: "array", values: ["1", "2", "3"]}];
        const expectedCall = {
            setupCode: [
                "int arr[3] = { 1, 2, 3 };",
            ],
            argumentsList: ["arr"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("handles scalar after an fixed-length array", () => {
        const parameters: FunctionParameter[] = [
            arrayParam("int[3]", "arr", "int", 3),
            scalarParam("int", "a"),
        ];

        const inputValues: PreparedParameterInput[] = [
            {kind: "array", values: ["1", "2", "3"]},
            {kind: "scalar", value: "42"},
        ];
        const expectedCall = {
            setupCode: [
                "int arr[3] = { 1, 2, 3 };",
            ],
            argumentsList: ["arr", "42"],
        };
        const actualCall = prepareFunctionCall(parameters, inputValues);

        assert.deepStrictEqual(actualCall, expectedCall);
    });

    test("rejects too few array values", () => {
        const parameters: FunctionParameter[] = [
            arrayParam("int[3]", "arr", "int", 3),
        ];

        assert.throws(
            () => prepareFunctionCall(parameters, [
                {kind: "array", values: ["1", "2"]},
            ]),
            /Array parameter arr requires 3 values, but received 2/,
        );
    });

    test("rejects too many array values", () => {
        const parameters: FunctionParameter[] = [
            arrayParam("int[3]", "arr", "int", 3),
        ];

        assert.throws(
            () => prepareFunctionCall(parameters, [
                {kind: "array", values: ["1", "2", "3", "4"]},
            ]),
            /Array parameter arr requires 3 values, but received 4/,
        );
    });
});