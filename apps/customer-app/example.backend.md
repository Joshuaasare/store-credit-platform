**student.types.ts**

import {
BaseStudent,
BaseStudentGuardian,
BaseGuardian,
BaseClass,
Religion,
Gender,
Pagination,
} from "./main.types";

export type StudentGuardian = BaseStudentGuardian & { guardian: BaseGuardian };

export type Student = BaseStudent & {
student_guardians: StudentGuardian[];
student_class?: BaseClass;
};

export type StudentRequestData = {
surname: string;
other_names?: string;
gender?: Gender | null;
email?: string;
phone?: string;
dob?: number;
residential_address?: string | null;
postal_address?: string | null;
religion?: Religion | null;
notes?: string | null;
medical_history?: string | null;
picture_url?: string | null;
nationality?: string | null;
hometown?: string | null;
reference_number?: string | null;
class_id?: number | null;
is_boarder?: boolean | null;
date_admitted?: number | null;
last_school?: string | null;
status?: string | null;
};

export type StudentRequestQueryParameters = {
page?: number;
size?: number;
class_ids?: number[];
search_term?: string;
};

export type GuardianRequestData = {
guardian_id?: number | null;
guardian_user_id?: string | null;
surname: string;
other_names: string;
relationship: string;
email?: string | null;
phone?: string | null;
address?: string | null;
occupation?: string | null;
};

export type StudentGuardianRequestData = {
student_id: number;
guardian_id: number;
relationship: string;
};

export type CreateStudentRequest = {
student: StudentRequestData;
student_guardians?: GuardianRequestData[];
};

export type UpdateStudentRequest = {
student: Partial<StudentRequestData>;
student_guardians?: GuardianRequestData[];
};

export type GetStudentResponse = {
success: true;
data: Student;
};

export type GetAllStudentsResponse = {
success: true;
data: Student[];
pagination?: Pagination;
};

export type CreateStudentResponse = {
success: true;
data: BaseStudent;
};

export type UpdateStudentResponse = {
success: true;
data: {
student: BaseStudent;
};
};

export type DeleteStudentResponse = {
success: true;
};

export type StudentErrorResponse = {
success: false;
error: string;
};

**routes/students/index.ts**
import { FastifyPluginAsync } from "fastify";
import { StudentService } from "../../services/student.service";
import { requireAuth } from "../../middleware";
import {
CreateStudentRequest,
CreateStudentResponse,
DeleteStudentResponse,
GetAllStudentsResponse,
GetStudentResponse,
StudentErrorResponse,
UpdateStudentRequest,
UpdateStudentResponse,
} from "../../schemas/student.schema";
import { parseQueryParamToIntArray } from "../../utils/utils";

const studentRoutes: FastifyPluginAsync = async (fastify) => {
fastify.get<{
Querystring: {
page?: string | number;
size?: string | number;
search_term?: string;
class_ids?: string;
};
}>(
"/",
{
preHandler: [requireAuth],
schema: {
response: {
200: GetAllStudentsResponse,
500: StudentErrorResponse,
},
},
},
async (request, reply) => {
try {
const studentService = new StudentService();
const { getAllStudents, searchStudents } = studentService;
const { class_ids, page, size, search_term } = request.query ?? {};
const paramters = {
page: Number(page),
size: Number(size),
school_id: request.user.school_id,
};
const { data, pagination } = search_term
? await searchStudents({ ...paramters, search_term })
: await getAllStudents({
...paramters,
class_ids: parseQueryParamToIntArray(class_ids),
});

        return reply.status(200).send({
          success: true,
          data,
          pagination,
        });
      } catch (error) {
        console.log("error", error);
        return reply.status(500).send({
          success: false,
          error: `Failed to fetch students ${error}`,
        });
      }
    },

);

fastify.get<{
Querystring: {
page?: string | number;
size?: string | number;
search_term?: string;
};
}>(
"/search",
{
preHandler: [requireAuth],
schema: {
response: {
200: GetAllStudentsResponse,
500: StudentErrorResponse,
},
},
},
async (request, reply) => {
try {
const studentService = new StudentService();
const { search_term, page, size } = request.query ?? {};
const { data, pagination } = await studentService.searchStudents({
page: Number(page),
size: Number(size),
search_term,
school_id: request.user.school_id,
});

        return reply.status(200).send({
          success: true,
          data,
          pagination,
        });
      } catch (error) {
        console.log("error", error);
        return reply.status(500).send({
          success: false,
          error: `Failed to fetch students ${error}`,
        });
      }
    },

);

fastify.get(
"/:id",
{
preHandler: [requireAuth],
schema: {
response: {
200: GetStudentResponse,
404: StudentErrorResponse,
},
},
},
async (request, reply) => {
try {
const { id } = request.params as { id: string };
const studentService = new StudentService();
const student = await studentService.getStudentById(Number(id));
return reply.send({
success: true,
data: student,
});
} catch (error) {
return reply.status(404).send({
success: false,
error: `Student not found: ${error}`,
});
}
},
);

fastify.post<{ Body: CreateStudentRequest }>(
"/",
{
preHandler: [requireAuth],
schema: {
body: CreateStudentRequest,
response: {
200: CreateStudentResponse,
400: StudentErrorResponse,
},
},
},
async (request, reply) => {
try {
const school_id = request.user.school_id;
const school_name = request.user.school_name;
const studentData = request.body;
const studentService = new StudentService();

        const newStudent = await studentService.createStudent(
          studentData,
          school_id,
          school_name ?? "Your child's school",
        );

        return reply.code(200).send({
          success: true,
          data: newStudent,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          error: `Failed to create student : ${error}`,
        });
      }
    },

);

fastify.put<{ Body: UpdateStudentRequest }>(
"/:id",
{
preHandler: [requireAuth],
schema: {
body: UpdateStudentRequest,
response: {
200: UpdateStudentResponse,
500: StudentErrorResponse,
},
},
},
async (request, reply) => {
try {
const school_id = request.user.school_id;
const school_name = request.user.school_name;
const { id } = request.params as { id: string };
const studentService = new StudentService();
const updatedStudent = await studentService.updateStudent(
Number(id),
request.body,
school_id,
school_name ?? "Your child's school",
);

        reply.code(200).send({
          success: true,
          data: {
            student: updatedStudent,
          },
        });
      } catch (error) {
        console.log("error", error);
        return reply.status(500).send({
          success: false,
          error: `Failed to update student: ${error}`,
        });
      }
    },

);

fastify.delete<{
Params: { id: string };
}>(
"/:id",
{
preHandler: [requireAuth],
schema: {
response: {
200: DeleteStudentResponse,
500: StudentErrorResponse,
},
},
},
async (request, reply) => {
try {
const { id } = request.params;
const studentService = new StudentService();
await studentService.deleteStudent(Number(id), request.user.school_id);
return reply.status(200).send({
success: true,
});
} catch (error) {
return reply.status(500).send({
success: false,
error: `Failed to delete student: ${error}`,
});
}
},
);
};

export default studentRoutes;

**student.service.ts**
import { QueryFragments } from "../constants/queryFragments";
import {
CreateStudentRequest,
StudentRequestQueryParameters,
UpdateStudentRequest,
} from "../schemas/student.schema";
import { StudentGuardianRequestData } from "../types/student.types";
import {
createFullGuardian,
getGuardiansToRemove,
splitSearchTerm,
updateFullGuardian,
} from "../utils/utils";
import { supabaseAdmin } from "./supabase-client.service";

export class StudentService {
async getAllStudents(
data: StudentRequestQueryParameters & { school_id: number },
) {
const { page, size, class_ids, school_id } = data;
// Build base query
let query = supabaseAdmin
.getClient()
.from("students")
.select(
`${QueryFragments.BASE_STUDENT},
        student_class:student_classes(*),
        student_guardians!student_id(*,guardian:guardians(*))`,
{ count: "exact" }, // Get total count
)
.eq("school_id", school_id)
.is("deleted_at", null)
.is("student_class.deleted_at", null)
.is("student_guardians.deleted_at", null)
.order("surname");

    // Apply filters
    if (class_ids && class_ids.length > 0) {
      query = query.in("class_id", class_ids);
    }

    // If pagination is requested
    if (page && size) {
      const from = (page - 1) * size;
      const to = from + size - 1;
      query = query.range(from, to);
    }

    const { data: students, error, count } = await query;

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to fetch students: ${error}`);
    }

    let pagination = null;

    // If pagination was requested, return with metadata
    if (page && size) {
      const total = count || 0;
      const totalPages = Math.ceil(total / size);
      pagination = {
        page,
        size,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }

    // Otherwise, return just the data (backwards compatible)
    return {
      data: students,
      pagination,
    };

}

async searchStudents(
data: StudentRequestQueryParameters & { school_id: number },
) {
const { search_term, page = 1, size = 50, school_id } = data;
// Get search results
let query = supabaseAdmin
.getClient()
.from("students")
.select(
`${QueryFragments.BASE_STUDENT},
        student_class:student_classes(*),
        student_guardians!student_id(*,guardian:guardians(*))`,
{ count: "exact" }, // Get total count
)
.eq("school_id", school_id)
.is("deleted_at", null)
.is("student_class.deleted_at", null)
.is("student_guardians.deleted_at", null)
.order("surname");

    if (search_term) {
      const termParts = splitSearchTerm(search_term);
      for (const part of termParts) {
        query = query.or(`surname.ilike.%${part}%,other_names.ilike.%${part}%`);
      }
    }

    // If pagination is requested
    if (page && size) {
      const from = (page - 1) * size;
      const to = from + size - 1;
      query = query.range(from, to);
    }

    const { data: students, error, count } = await query;

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to fetch students: ${error}`);
    }

    let pagination = null;

    // If pagination was requested, return with metadata
    if (page && size) {
      const total = count || 0;
      const totalPages = Math.ceil(total / size);
      pagination = {
        page,
        size,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }

    // Otherwise, return just the data (backwards compatible)
    return {
      data: students,
      pagination,
    };

}

async getStudentById(id: number) {
const { data, error } = await supabaseAdmin
.getClient()
.from("students")
.select(
`${QueryFragments.BASE_STUDENT},
        student_class:student_classes(*),
        student_guardians!student_id(*,guardian:guardians(*))`,
)
.eq("id", id)
.is("deleted_at", null)
.is("student_class.deleted_at", null)
.is("student_guardians.deleted_at", null)
.single();

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to fetch student: ${error}`);
    }
    return data;

}

async createStudent(
studentData: CreateStudentRequest,
school_id: number,
school_name: string,
) {
const { student, student_guardians } = studentData;

    const { data: createdStudent, error } = await supabaseAdmin
      .getClient()
      .from("students")
      .insert({
        ...student,
        school_id,
      })
      .select(`${QueryFragments.BASE_STUDENT}`)
      .single();

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to create student: ${error}`);
    }

    if (student_guardians && student_guardians.length > 0) {
      await Promise.all(
        student_guardians?.map(async (guardian) => {
          await createFullGuardian(
            guardian,
            school_id,
            createdStudent.id,
            school_name ?? "Your child's school",
          );
        }),
      );
    }

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to create student: ${error}`);
    }

    return createdStudent;

}

async createStudentGuardian(
guardianData: StudentGuardianRequestData,
onError?: () => Promise<void>,
) {
const { data, error } = await supabaseAdmin
.getClient()
.from("student_guardians")
.insert(guardianData);
if (error) {
console.log("error", error);
await onError?.();
throw new Error(`Failed to create student guardian: ${error}`);
}
return data;
}

async updateStudentGuardian(
guardianData: StudentGuardianRequestData,
onError?: () => Promise<void>,
) {
const { data, error } = await supabaseAdmin
.getClient()
.from("student_guardians")
.update(guardianData)
.eq("guardian_id", guardianData.guardian_id)
.eq("student_id", guardianData.student_id)
.select()
.single();
if (error) {
console.log("error", error);
await onError?.();
throw new Error(`Failed to update student guardian: ${error}`);
}
return data;
}

async deleteStudentGuardian(studentId: number, guardianId: number) {
const { data, error } = await supabaseAdmin
.getClient()
.from("student_guardians")
.update({
deleted_at: new Date().toISOString(),
updated_at: new Date().toISOString(),
})
.eq("student_id", studentId)
.eq("guardian_id", guardianId);
if (error) {
console.log("error", error);
throw new Error(`Failed to delete student guardian: ${error}`);
}
return data;
}

async getStudentGuardians(studentId: number) {
const { data, error } = await supabaseAdmin
.getClient()
.from("student*guardians")
.select("*,guardian:guardians(\_)")
.eq("student_id", studentId)
.is("deleted_at", null);
if (error) {
console.log("error", error);
throw new Error(`Failed to fetch student guardians: ${error}`);
}
return data;
}

async updateStudent(
id: number,
studentData: UpdateStudentRequest,
school_id: number,
school_name: string,
) {
const studentService = new StudentService();
const { student, student_guardians } = studentData;
const { data: updatedStudent, error } = await supabaseAdmin
.getClient()
.from("students")
.update(student)
.eq("id", id)
.select(`${QueryFragments.BASE_STUDENT}`)
.single();

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to update student: ${error?.message}`);
    }

    const guardiansToRemove = await getGuardiansToRemove(
      Number(id),
      student_guardians,
    );

    await Promise.all(
      guardiansToRemove.map(
        async (guardian) =>
          await studentService.deleteStudentGuardian(
            Number(id),
            guardian.guardian_id,
          ),
      ),
    );

    if (student_guardians && student_guardians.length > 0) {
      await Promise.all(
        student_guardians.map(async (guardian) => {
          if (guardian.guardian_id && guardian.guardian_user_id) {
            return await updateFullGuardian(
              guardian,
              school_id,
              school_name,
              Number(id),
            );
          } else {
            return await createFullGuardian(
              guardian,
              school_id,
              Number(id),
              school_name,
            );
          }
        }),
      );
    }

    return updatedStudent;

}

async deleteStudent(id: number, school_id: number) {
const { error } = await supabaseAdmin
.getClient()
.from("students")
.update({
deleted_at: new Date().toISOString(),
updated_at: new Date().toISOString(),
})
.eq("id", id)
.eq("school_id", school_id);

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to delete student: ${error?.message}`);
    }

}

async removeStudent(id: number, school_id: number) {
const { error } = await supabaseAdmin
.getClient()
.from("students")
.update({
deleted_at: new Date().toISOString(),
updated_at: new Date().toISOString(),
})
.eq("id", id)
.eq("school_id", school_id);

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to delete student: ${error?.message}`);
    }

}
}

**transactions.types.ts**
import {
BaseBill,
BaseClass,
BaseStudent,
BaseStudentTransaction,
BaseTransactionAccount,
Pagination,
} from "./main.types";

export type TransactionAccount = BaseTransactionAccount;

export type Transaction = BaseStudentTransaction & {
student?: BaseStudent & { student_class?: BaseClass };
bill?: BaseBill;
};

export interface GetTransactionAccountsResponse {
success: true;
data: TransactionAccount[];
}

export type FinanceErrorResponse = {
success: false;
error: string;
};

export type TransactionRequestData = {
student_id: number;
bill_id: number;
amount: number;
description: string;
payment_method?: string | null;
payment_method_ref?: string | null;
acad_year: number;
term: number;
date: number;
};

export interface CreateTransactionRequest {
transaction: TransactionRequestData;
}

export interface UpdateTransactionRequest {
transaction: Partial<TransactionRequestData>;
}

export type TransactionRequestQueryParameters = {
page?: number;
size?: number;
student_id?: number;
bill_id?: number;
acad_year?: number | null;
term?: number | null;
payment_method?: string;
search_term?: string;
};

export interface CreateTransactionResponse {
success: true;
data: Transaction;
}

export interface UpdateTransactionResponse {
success: true;
data: Transaction;
}

export interface DeleteTransactionResponse {
success: true;
}

export interface GetTransactionsResponse {
success: true;
data: Transaction[];
pagination?: Pagination;
}

export interface GetTransactionResponse {
success: true;
data: Transaction;
}

export type TransactionErrorResponse = {
success: false;
error: string;
};

**routes/transactions/index.ts**
import { FastifyPluginAsync } from "fastify";
import { TransactionService } from "../../services/transaction.service";
import { requireAuth } from "../../middleware";
import { parseQueryParamToInt } from "../../utils/utils";
import {
CreateTransactionRequest,
UpdateTransactionRequest,
} from "../../schemas/transactions.schema";

const transactionRoutes: FastifyPluginAsync = async (fastify) => {
// Get all transactions with optional filtering and pagination
fastify.get<{
Querystring: {
acad_year?: string;
term?: string;
page?: string;
size?: string;
student_id?: string;
bill_id?: string;
payment_method?: string;
search_term?: string;
};
}>(
"/",
{
preHandler: [requireAuth],
},
async (request, reply) => {
try {
const transactionService = new TransactionService();
const school_id = request.user.school_id;
const {
student_id,
bill_id,
page,
size,
acad_year,
term,
payment_method,
search_term,
} = request.query;

        const { data, pagination } =
          await transactionService.getAllTransactions({
            school_id,
            student_id: parseQueryParamToInt(student_id),
            bill_id: parseQueryParamToInt(bill_id),
            page: parseQueryParamToInt(page),
            size: parseQueryParamToInt(size),
            acad_year: parseQueryParamToInt(acad_year),
            term: parseQueryParamToInt(term),
            search_term,
            payment_method,
          });

        return reply.status(200).send({
          success: true,
          data,
          pagination,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error?.message : "Unknown error";
        return reply.status(500).send({
          success: false,
          error: `Failed to fetch transactions: ${errorMessage}`,
        });
      }
    },

);

// Get transaction by ID
fastify.get<{
Params: { id: string };
}>(
"/:id",
{
preHandler: [requireAuth],
},
async (request, reply) => {
try {
const { id } = request.params;
const transactionService = new TransactionService();
const school_id = request.user.school_id;

        const transaction = await transactionService.getTransactionById(
          parseInt(id),
          school_id,
        );

        if (!transaction) {
          return reply.status(404).send({
            success: false,
            error: "Transaction not found",
          });
        }

        return reply.status(200).send({
          success: true,
          data: transaction,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return reply.status(500).send({
          success: false,
          error: `Failed to fetch transaction: ${errorMessage}`,
        });
      }
    },

);

// Create a new transaction
fastify.post<{
Body: CreateTransactionRequest;
}>(
"/",
{
preHandler: [requireAuth],
},
async (request, reply) => {
try {
const transactionService = new TransactionService();
const school_id = request.user.school_id;
const user_id = request.user.id;

        const transaction = await transactionService.createTransaction(
          request.body,
          school_id,
          user_id,
        );

        return reply.status(201).send({
          success: true,
          data: transaction,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return reply.status(500).send({
          success: false,
          error: `Failed to create transaction: ${errorMessage}`,
        });
      }
    },

);

// Update a transaction
fastify.put<{
Params: { id: string };
Body: UpdateTransactionRequest;
}>(
"/:id",
{
preHandler: [requireAuth],
},
async (request, reply) => {
try {
const { id } = request.params;
const transactionService = new TransactionService();
const school_id = request.user.school_id;

        const transaction = await transactionService.updateTransaction(
          parseInt(id),
          request.body,
          school_id,
        );

        return reply.status(200).send({
          success: true,
          data: transaction,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return reply.status(500).send({
          success: false,
          error: `Failed to update transaction: ${errorMessage}`,
        });
      }
    },

);

// Delete a transaction
fastify.delete<{
Params: { id: string };
}>(
"/:id",
{
preHandler: [requireAuth],
},
async (request, reply) => {
try {
const { id } = request.params;
const transactionService = new TransactionService();
const school_id = request.user.school_id;

        await transactionService.deleteTransaction(parseInt(id), school_id);

        return reply.status(200).send({
          success: true,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return reply.status(500).send({
          success: false,
          error: `Failed to delete transaction: ${errorMessage}`,
        });
      }
    },

);

// Get transactions by student ID
fastify.get<{
Params: { studentId: string };
}>(
"/student/:studentId",
{
preHandler: [requireAuth],
},
async (request, reply) => {
try {
const { studentId } = request.params;
const transactionService = new TransactionService();
const school_id = request.user.school_id;

        const transactions =
          await transactionService.getTransactionsByStudentId(
            parseInt(studentId),
            school_id,
          );

        return reply.status(200).send({
          success: true,
          data: transactions,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return reply.status(500).send({
          success: false,
          error: `Failed to fetch student transactions: ${errorMessage}`,
        });
      }
    },

);

// Get transactions by bill ID
fastify.get<{
Params: { billId: string };
}>(
"/bill/:billId",
{
preHandler: [requireAuth],
},
async (request, reply) => {
try {
const { billId } = request.params;
const transactionService = new TransactionService();
const school_id = request.user.school_id;

        const transactions = await transactionService.getTransactionsByBillId(
          parseInt(billId),
          school_id,
        );

        return reply.status(200).send({
          success: true,
          data: transactions,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return reply.status(500).send({
          success: false,
          error: `Failed to fetch bill transactions: ${errorMessage}`,
        });
      }
    },

);
};

export default transactionRoutes;

**transaction.service.ts**
import { supabaseAdmin } from "./supabase-client.service";
import { QueryFragments } from "../constants/queryFragments";
import {
Transaction,
TransactionRequestQueryParameters,
CreateTransactionRequest,
UpdateTransactionRequest,
} from "../schemas/transactions.schema";

export class TransactionService {
/\*\*

- Get all transactions with optional filtering and pagination
- Uses Postgres function for efficient search and filtering
  \*/
  async getAllTransactions(
  data: TransactionRequestQueryParameters & { school_id: number },
  ) {
  const {
  acad_year,
  page = 1,
  school_id,
  size = 30,
  student_id,
  bill_id,
  term,
  payment_method,
  search_term,
  } = data;


    // Use Postgres function for search and filtering
    const { data: transactions, error } = await supabaseAdmin
      .getClient()
      .rpc("search_transactions_paginated", {
        p_school_id: school_id,
        p_search_term: search_term,
        p_acad_year: acad_year ?? undefined,
        p_term: term ?? undefined,
        p_student_id: student_id,
        p_bill_id: bill_id,
        p_payment_method: payment_method,
        p_page: page,
        p_page_size: size,
      });

    if (error) {
      console.log("error", error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    // Get total count for pagination
    const { data: totalCount, error: countError } = await supabaseAdmin
      .getClient()
      .rpc("count_search_transactions", {
        p_school_id: school_id,
        p_search_term: search_term,
        p_acad_year: acad_year ?? undefined,
        p_term: term ?? undefined,
        p_student_id: student_id ?? undefined,
        p_bill_id: bill_id ?? undefined,
        p_payment_method: payment_method ?? undefined,
      });

    if (countError) {
      console.log("count error", countError);
      throw new Error(`Failed to count transactions: ${countError.message}`);
    }

    const total = totalCount || 0;
    const totalPages = Math.ceil(total / size);
    const pagination = {
      page,
      size,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    return {
      data: transactions,
      pagination,
    };

}

/\*\*

- Get a single transaction by ID
  \*/
  async getTransactionById(id: number, school_id: number) {
  const { data, error } = await supabaseAdmin
  .getClient()
  .from("student_transactions")
  .select(
  `${QueryFragments.BASE_STUDENT_TRANSACTION},
      student:students(${QueryFragments.BASE_STUDENT},
      student_class:student_classes(${QueryFragments.BASE_CLASS})),
      bill:bills(${QueryFragments.BASE_BILL})
    `,
  )
  .eq("id", id)
  .eq("school_id", school_id)
  .is("deleted_at", null)
  .is("student.deleted_at", null)
  .is("bill.deleted_at", null)
  .single();


    if (error) {
      console.log("error", error);
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }

    return data as Transaction;

}

/\*\*

- Create a new transaction
  \*/
  async createTransaction(
  requestData: CreateTransactionRequest,
  school_id: number,
  user_id: string,
  ) {
  const { transaction } = requestData;


    // Verify the bill exists and belongs to this school
    const { data: bill, error: billError } = await supabaseAdmin
      .getClient()
      .from("bills")
      .select("id, school_id, amount")
      .eq("id", transaction.bill_id)
      .eq("school_id", school_id)
      .is("deleted_at", null)
      .single();

    if (billError || !bill) {
      throw new Error("Bill not found or does not belong to this school");
    }

    // Verify the student exists and belongs to this school
    const { data: student, error: studentError } = await supabaseAdmin
      .getClient()
      .from("students")
      .select("id, school_id")
      .eq("id", transaction.student_id)
      .eq("school_id", school_id)
      .is("deleted_at", null)
      .single();

    if (studentError || !student) {
      throw new Error("Student not found or does not belong to this school");
    }

    // Create the transaction
    const { data: newTransaction, error: createError } = await supabaseAdmin
      .getClient()
      .from("student_transactions")
      .insert({
        school_id,
        student_id: transaction.student_id,
        bill_id: transaction.bill_id,
        amount: transaction.amount,
        description: transaction.description,
        payment_method: transaction.payment_method || null,
        payment_method_ref: transaction.payment_method_ref || null,
        acad_year: transaction.acad_year,
        term: transaction.term,
        created_by_user_id: user_id,
        date: transaction.date || new Date().getTime(),
      })
      .select(
        `${QueryFragments.BASE_STUDENT_TRANSACTION},
        student:students(${QueryFragments.BASE_STUDENT},student_class:student_classes(${QueryFragments.BASE_CLASS})),
        bill:bills(${QueryFragments.BASE_BILL})
      `,
      )
      .single();

    if (createError) {
      console.log("error", createError);
      throw new Error(`Failed to create transaction: ${createError.message}`);
    }

    return newTransaction as Transaction;

}

/\*\*

- Update an existing transaction
  \*/
  async updateTransaction(
  id: number,
  requestData: UpdateTransactionRequest,
  school_id: number,
  ) {
  const { transaction } = requestData;


    // Verify the transaction exists and belongs to this school
    const { data: existingTransaction, error: fetchError } = await supabaseAdmin
      .getClient()
      .from("student_transactions")
      .select("id, school_id, amount, bill_id")
      .eq("id", id)
      .eq("school_id", school_id)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existingTransaction) {
      throw new Error(
        "Transaction not found or does not belong to this school",
      );
    }

    // If bill_id is being updated, verify it exists and belongs to this school
    if (transaction.bill_id) {
      const { data: bill, error: billError } = await supabaseAdmin
        .getClient()
        .from("bills")
        .select("id, school_id")
        .eq("id", transaction.bill_id)
        .eq("school_id", school_id)
        .is("deleted_at", null)
        .single();

      if (billError || !bill) {
        throw new Error("Bill not found or does not belong to this school");
      }
    }

    // If student_id is being updated, verify it exists and belongs to this school
    if (transaction.student_id) {
      const { data: student, error: studentError } = await supabaseAdmin
        .getClient()
        .from("students")
        .select("id, school_id")
        .eq("id", transaction.student_id)
        .eq("school_id", school_id)
        .is("deleted_at", null)
        .single();

      if (studentError || !student) {
        throw new Error("Student not found or does not belong to this school");
      }
    }

    // Update the transaction
    const { data: updatedTransaction, error: updateError } = await supabaseAdmin
      .getClient()
      .from("student_transactions")
      .update({
        student_id: transaction.student_id,
        bill_id: transaction.bill_id,
        amount: transaction.amount,
        description: transaction.description,
        payment_method: transaction.payment_method,
        payment_method_ref: transaction.payment_method_ref,
        acad_year: transaction.acad_year,
        term: transaction.term,
        date: transaction.date,
      })
      .eq("id", id)
      .eq("school_id", school_id)
      .select(
        `${QueryFragments.BASE_STUDENT_TRANSACTION},
        student:students(${QueryFragments.BASE_STUDENT},student_class:student_classes(${QueryFragments.BASE_CLASS})),
        bill:bills(${QueryFragments.BASE_BILL})
      `,
      )
      .single();

    if (updateError) {
      console.log("error", updateError);
      throw new Error(`Failed to update transaction: ${updateError.message}`);
    }

    return updatedTransaction as Transaction;

}

/\*\*

- Delete a transaction (soft delete by setting is_deleted = true if the column exists,
- otherwise hard delete)
  \*/
  async deleteTransaction(id: number, school_id: number) {
  // Verify the transaction exists and belongs to this school
  const { data: existingTransaction, error: fetchError } = await supabaseAdmin
  .getClient()
  .from("student_transactions")
  .select("id, school_id")
  .eq("id", id)
  .eq("school_id", school_id)
  .is("deleted_at", null)
  .single();


    if (fetchError || !existingTransaction) {
      throw new Error(
        "Transaction not found or does not belong to this school",
      );
    }

    // Hard delete (student_transactions table doesn't have is_deleted column based on schema)
    const { error: deleteError } = await supabaseAdmin
      .getClient()
      .from("student_transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .eq("school_id", school_id);

    if (deleteError) {
      console.log("error", deleteError);
      throw new Error(`Failed to delete transaction: ${deleteError.message}`);
    }

    return true;

}

/\*\*

- Get transactions by student ID
  \*/
  async getTransactionsByStudentId(student_id: number, school_id: number) {
  const { data, error } = await supabaseAdmin
  .getClient()
  .from("student_transactions")
  .select(
  `${QueryFragments.BASE_STUDENT_TRANSACTION},
      student:students(${QueryFragments.BASE_STUDENT},student_class:student_classes(${QueryFragments.BASE_CLASS})),
      bill:bills(${QueryFragments.BASE_BILL})
    `,
  )
  .eq("student_id", student_id)
  .eq("school_id", school_id)
  .is("deleted_at", null)
  .order("created_at", { ascending: false });


    if (error) {
      console.log("error", error);
      throw new Error(`Failed to fetch student transactions: ${error.message}`);
    }

    return data as Transaction[];

}

/\*\*

- Get transactions by bill ID
  \*/
  async getTransactionsByBillId(bill_id: number, school_id: number) {
  const { data, error } = await supabaseAdmin
  .getClient()
  .from("student_transactions")
  .select(
  `${QueryFragments.BASE_STUDENT_TRANSACTION},
      student:students(${QueryFragments.BASE_STUDENT},student_class:student_classes(${QueryFragments.BASE_CLASS})),
      bill:bills(${QueryFragments.BASE_BILL})
    `,
  )
  .eq("bill_id", bill_id)
  .eq("school_id", school_id)
  .is("deleted_at", null)
  .order("created_at", { ascending: false });


    if (error) {
      console.log("error", error);
      throw new Error(`Failed to fetch bill transactions: ${error.message}`);
    }

    return data as Transaction[];

}
}
