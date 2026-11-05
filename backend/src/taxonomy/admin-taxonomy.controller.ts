import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { AdminTaxonomyService } from "./admin-taxonomy.service";
import {
  AdminCategoryListQueryDto,
  ChangeLifecycleDto,
  CreateCategoryDto,
  CreateSubcategoryDto,
  MergeCategoryDto,
  ReorderCategoriesDto,
  UpdateCategoryDto,
  UpdateSubcategoryDto,
} from "./dto/admin-taxonomy.dto";

@Controller("admin/taxonomy")
@ApiTags("Admin: taxonomy builder")
export class AdminTaxonomyController {
  constructor(private readonly taxonomy: AdminTaxonomyService) {}

  @Get("categories")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({
    summary: "List categories of every lifecycle (F-TAX-02)",
  })
  @ApiOkResponse({ description: "Categories with their current version." })
  async list(@Query() query: AdminCategoryListQueryDto) {
    return { items: await this.taxonomy.listCategories(query) };
  }

  @Get("categories/:categoryId")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({
    summary: "One category with its version history and subcategories",
  })
  @ApiNotFoundResponse({ description: "No such category." })
  get(@Param("categoryId", ParseUUIDPipe) categoryId: string) {
    return this.taxonomy.getCategory(categoryId);
  }

  @Post("categories")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({
    summary: "Create a category",
    description:
      "Starts as DRAFT (hidden) at version 1. Activate it with the lifecycle route.",
  })
  @ApiBadRequestResponse({ description: "Invalid field or unknown industry." })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() request: CreateCategoryDto,
  ) {
    return this.taxonomy.createCategory(actor, request);
  }

  @Patch("categories/:categoryId")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({
    summary: "Edit a category",
    description:
      "Changing name, aliases or configuration creates a new immutable version; existing deals keep theirs. alwaysShow is not versioned.",
  })
  @ApiConflictResponse({ description: "The category is retired." })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() request: UpdateCategoryDto,
  ) {
    return this.taxonomy.updateCategory(actor, categoryId, request);
  }

  @Post("categories/:categoryId/lifecycle")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({
    summary: "Move a category between Draft, Active, Restricted and Retired",
    description:
      "Allowed: DRAFT to ACTIVE or RETIRED; ACTIVE to RESTRICTED or RETIRED; RESTRICTED to ACTIVE or RETIRED. RETIRED is final. Reason required and audited.",
  })
  @ApiConflictResponse({ description: "That move is not allowed." })
  lifecycle(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() request: ChangeLifecycleDto,
  ) {
    return this.taxonomy.changeLifecycle(
      actor,
      categoryId,
      request.to,
      request.reason,
    );
  }

  @Post("categories/:categoryId/merge")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({
    summary: "Merge a category into another (retires it)",
    description:
      "Retires the category and records the target. Existing vendor selections and listings are not moved. Reason required and audited.",
  })
  @ApiConflictResponse({ description: "Source retired or target not usable." })
  merge(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() request: MergeCategoryDto,
  ) {
    return this.taxonomy.mergeCategory(
      actor,
      categoryId,
      request.intoCategoryId,
      request.reason,
    );
  }

  @Put("industries/:industryId/category-order")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({ summary: "Reorder an industry's categories" })
  @ApiBadRequestResponse({
    description: "The list is not exactly the industry's categories.",
  })
  reorder(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("industryId", ParseUUIDPipe) industryId: string,
    @Body() request: ReorderCategoriesDto,
  ) {
    return this.taxonomy.reorderCategories(
      actor,
      industryId,
      request.categoryIds,
    );
  }

  @Post("categories/:categoryId/subcategories")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({ summary: "Add a subcategory" })
  createSubcategory(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() request: CreateSubcategoryDto,
  ) {
    return this.taxonomy.createSubcategory(actor, categoryId, request);
  }

  @Patch("subcategories/:subcategoryId")
  @RequirePermission("taxonomy.manage")
  @ApiOperation({ summary: "Edit a subcategory" })
  updateSubcategory(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("subcategoryId", ParseUUIDPipe) subcategoryId: string,
    @Body() request: UpdateSubcategoryDto,
  ) {
    return this.taxonomy.updateSubcategory(actor, subcategoryId, request);
  }
}
