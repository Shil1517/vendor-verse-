import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AccessTokenGuard } from "../auth/access-token.guard";
import { AuthenticatedUser, CurrentUser } from "../auth/authenticated-user.decorator";
import { RequirePermission } from "../rbac/permission.guard";
import { CategorySuggestionsService } from "./category-suggestions.service";
import { CreateCategorySuggestionDto, DecideCategorySuggestionDto } from "./dto/category-suggestion.dto";

@Controller("taxonomy/suggestions")
@UseGuards(AccessTokenGuard)
@ApiTags("Category suggestions")
@ApiBearerAuth()
export class CategorySuggestionsController {
  constructor(private readonly suggestions: CategorySuggestionsService) {}

  @Get("mine")
  mine(@CurrentUser() user: AuthenticatedUser) { return this.suggestions.mine(user); }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateCategorySuggestionDto) {
    return this.suggestions.create(user, body);
  }
}

@Controller("admin/taxonomy/suggestions")
@ApiTags("Admin: category suggestions")
export class AdminCategorySuggestionsController {
  constructor(private readonly suggestions: CategorySuggestionsService) {}

  @Get()
  @RequirePermission("taxonomy.manage")
  queue() { return this.suggestions.queue(); }

  @Post(":suggestionId/decision")
  @RequirePermission("taxonomy.manage")
  decide(@CurrentUser() user: AuthenticatedUser, @Param("suggestionId", ParseUUIDPipe) id: string, @Body() body: DecideCategorySuggestionDto) {
    return this.suggestions.decide(user, id, body);
  }
}
